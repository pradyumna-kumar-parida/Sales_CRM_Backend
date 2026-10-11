import mongoose from "mongoose";
import Activity from "../models/Activity.js";
import User from "../models/user.js";
import Lead from "../models/Lead.js";
import Customer from "../models/Customer.js";
import Deal from "../models/Deal.js";

const activityTypes = [
  "Call",
  "Email",
  "Meeting",
  "Demo",
  "Follow-up",
  "Reminder",
  "Note",
];

const isExecutive = (user) => user.role === "Sales Executive";
const isManager = (user) => user.role === "Sales Manager";
const isAdmin = (user) => user.role === "Admin";

function canAccessActivity(activity, user) {
  if (isAdmin(user) || isManager(user)) return true;

  return (
    isExecutive(user) &&
    (activity.assignedTo?.toString() === user._id.toString() ||
      activity.createdBy?.toString() === user._id.toString())
  );
}

function activityResponse(activity) {
  const data = activity.toObject();

  data.displayStatus =
    data.status === "Pending" && new Date(data.dueDate) < new Date()
      ? "Overdue"
      : data.status;

  return data;
}

export const createActivity = async (req, res, next) => {
  try {
    const {
      type,
      title,
      description,
      assignedTo,
      dueDate,
      lead,
      customer,
      deal,
    } = req.body;

    if (!type || !title?.trim() || !assignedTo || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Type, title, assigned user and due date are required",
      });
    }

    if (!activityTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity type",
      });
    }

    const parsedDueDate = new Date(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date",
      });
    }

    const relations = [
      ["lead", lead, Lead],
      ["customer", customer, Customer],
      ["deal", deal, Deal],
    ].filter((item) => item[1]);

    if (relations.length !== 1) {
      return res.status(400).json({
        success: false,
        message: "Provide exactly one related lead, customer or deal",
      });
    }

    if (!mongoose.isValidObjectId(assignedTo)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assigned user ID",
      });
    }

    const employee = await User.findOne({
      _id: assignedTo,
      isActive: true,
    });

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Assigned user does not exist or is inactive",
      });
    }

    if (
      isExecutive(req.user) &&
      assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can assign activities only to yourself",
      });
    }

    const [relationName, relationId, RelationModel] = relations[0];

    if (!mongoose.isValidObjectId(relationId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${relationName} ID`,
      });
    }

    const relatedRecord = await RelationModel.findById(relationId);

    if (!relatedRecord) {
      return res.status(404).json({
        success: false,
        message: `${relationName} not found`,
      });
    }

    if (isExecutive(req.user)) {
      const owner =
        relationName === "lead"
          ? relatedRecord.assignedTo
          : relationName === "customer"
            ? relatedRecord.assignedTo
            : relatedRecord.assignedTo;

      if (owner?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can create activities only for your assigned records",
        });
      }
    }

    const activity = await Activity.create({
      type,
      title: title.trim(),
      description,
      assignedTo,
      dueDate: parsedDueDate,
      lead: lead || null,
      customer: customer || null,
      deal: deal || null,
      createdBy: req.user.id,
    });
    return res.status(201).json({
      success: true,
      message: "Activity created successfully",
      data: activityResponse(activity),
    });
  } catch (error) {
    next(error);
  }
};

export const getActivities = async (req, res, next) => {
  try {
    const {
      type,
      status,
      assignedTo,
      lead,
      customer,
      deal,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (isExecutive(req.user)) {
      filter.$or = [{ assignedTo: req.user._id }, { createdBy: req.user._id }];
    } else if (assignedTo) {
      if (!mongoose.isValidObjectId(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID",
        });
      }
      filter.assignedTo = assignedTo;
    }

    if (type) {
      if (!activityTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid activity type",
        });
      }
      filter.type = type;
    }

    if (status && !["Pending", "Completed", "Overdue"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity status",
      });
    }

    for (const field of ["lead", "customer", "deal"]) {
      if (req.query[field]) {
        if (!mongoose.isValidObjectId(req.query[field])) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${field} ID`,
          });
        }
        filter[field] = req.query[field];
      }
    }

    if (status === "Overdue") {
      filter.status = "Pending";
      filter.dueDate = { $lt: new Date() };
    } else if (status) {
      filter.status = status;
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate("assignedTo", "name email role")
        .populate("createdBy", "name email")
        .populate("lead", "name email")
        .populate("customer", "name email")
        .populate("deal", "name value stage")
        .sort({ dueDate: 1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize),
      Activity.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      message: "Activities fetched successfully",
      data: activities.map(activityResponse),
      pagination: {
        currentPage,
        pageSize,
        totalRecords: total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getActivityById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID",
      });
    }

    const activity = await Activity.findById(req.params.id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email")
      .populate("lead", "name email")
      .populate("customer", "name email")
      .populate("deal", "name value stage");

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    if (!canAccessActivity(activity, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this activity",
      });
    }

    return res.json({
      success: true,
      message: "Activity fetched successfully",
      data: activityResponse(activity),
    });
  } catch (error) {
    next(error);
  }
};

export const updateActivity = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID",
      });
    }

    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    if (!canAccessActivity(activity, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You cannot update this activity",
      });
    }

    if (activity.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Completed activities cannot be edited",
      });
    }

    const { type, title, description, dueDate } = req.body;

    if (type !== undefined) {
      if (!activityTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid activity type",
        });
      }
      activity.type = type;
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Title cannot be empty",
        });
      }
      activity.title = title.trim();
    }

    if (description !== undefined) activity.description = description;

    if (dueDate !== undefined) {
      const parsedDate = new Date(dueDate);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date",
        });
      }

      activity.dueDate = parsedDate;
    }

    await activity.save();

    return res.json({
      success: true,
      message: "Activity updated successfully",
      data: activityResponse(activity),
    });
  } catch (error) {
    next(error);
  }
};

export const completeActivity = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID",
      });
    }

    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    if (!canAccessActivity(activity, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You cannot complete this activity",
      });
    }

    if (activity.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Activity is already completed",
      });
    }

    activity.status = "Completed";
    activity.completedAt = new Date();

    await activity.save();

    return res.json({
      success: true,
      message: "Activity marked as completed",
      data: activityResponse(activity),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteActivity = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID",
      });
    }

    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found",
      });
    }

    if (!isAdmin(req.user) && !isManager(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Sales Manager can delete activities",
      });
    }

    await activity.deleteOne();

    return res.json({
      success: true,
      message: "Activity deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
