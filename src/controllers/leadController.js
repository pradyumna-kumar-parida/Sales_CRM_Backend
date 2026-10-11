import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import User from "../models/user.js";
import Customer from "../models/Customer.js";
import Deal from "../models/Deal.js";
import Timeline from "../models/Timeline.js";

export const createLead = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      source,
      priority,
      assignedTo,
      description,
    } = req.body;

    if (!name || !source) {
      return res.status(400).json({
        success: false,
        message: "Name and source are required",
      });
    }

    const allowedSources = [
      "Website",
      "Referral",
      "Social Media",
      "Email",
      "Phone",
      "Other",
    ];

    if (!allowedSources.includes(source)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead source",
      });
    }

    const allowedPriorities = ["Low", "Medium", "High"];

    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead priority",
      });
    }

    let assignedUserId = null;

    if (assignedTo) {
      if (!mongoose.isValidObjectId(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID",
        });
      }

      const assignedUser = await User.findById(assignedTo);

      if (
        !assignedUser ||
        !assignedUser.isActive ||
        assignedUser.role !== "Sales Executive"
      ) {
        return res.status(400).json({
          success: false,
          message: "Assigned user must be an active Sales Executive",
        });
      }

      if (req.user.role !== "Admin" && req.user.role !== "Sales Manager") {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to assign leads",
        });
      }

      assignedUserId = assignedUser._id;
    }

    const lead = await Lead.create({
      name,
      email,
      phone,
      company,
      source,
      priority,
      assignedTo: assignedUserId,
      description,
      createdBy: req.user.id,
    });

    await Timeline.create({
      action: "Lead Created",
      entityType: "Lead",
      entityId: lead._id,
      performedBy: req.user.id,
      previousValue: null,
      newValue: {
        name: lead.name,
        status: lead.status,
        priority: lead.priority,
        assignedTo: lead.assignedTo,
      },
      description: `Lead ${lead.name} was created`,
    });

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const getLeads = async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      source,
      startDate,
      endDate,
      page,
      limit = 10,
    } = req.query;

    const filter = {};

    if (req.user.role === "Sales Executive") {
      filter.assignedTo = req.user.id;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (source) filter.source = source;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const currentPage = Number(page) || 1;
    const pageSize = Number(limit);
    const skip = (currentPage - 1) * pageSize;

    const leads = await Lead.find(filter)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const totalLeads = await Lead.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        totalLeads,
        currentPage,
        totalPages: Math.ceil(totalLeads / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead = await Lead.findById(id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (
      req.user.role === "Sales Executive" &&
      lead.assignedTo?._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this lead",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead fetched successfully",
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      phone,
      company,
      source,
      status,
      priority,
      description,
    } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (
      req.user.role === "Sales Executive" &&
      lead.assignedTo?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this lead",
      });
    }

    const previousValue = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      status: lead.status,
      priority: lead.priority,
      description: lead.description,
    };

    const updates = {
      name,
      email,
      phone,
      company,
      source,
      status,
      priority,
      description,
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        lead[key] = updates[key];
      }
    });

    await lead.save();

    const changedFields = {};

    for (const key of Object.keys(updates)) {
      if (
        updates[key] !== undefined &&
        String(previousValue[key] ?? "") !== String(lead[key] ?? "")
      ) {
        changedFields[key] = {
          from: previousValue[key] ?? null,
          to: lead[key] ?? null,
        };
      }
    }

    if (Object.keys(changedFields).length > 0) {
      await Timeline.create({
        action: "Lead Updated",
        entityType: "Lead",
        entityId: lead._id,
        performedBy: req.user.id,
        previousValue,
        newValue: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          source: lead.source,
          status: lead.status,
          priority: lead.priority,
          description: lead.description,
          changedFields,
        },
        description: `Lead ${lead.name} was updated`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const assignLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    if (!mongoose.isValidObjectId(assignedTo)) {
      return res.status(400).json({
        success: false,
        message: "Valid assignedTo user ID is required",
      });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    const assignedUser = await User.findById(assignedTo);

    if (
      !assignedUser ||
      !assignedUser.isActive ||
      assignedUser.role !== "Sales Executive"
    ) {
      return res.status(400).json({
        success: false,
        message: "Assigned user must be an active Sales Executive",
      });
    }

    const previousAssignedTo = lead.assignedTo;

    if (previousAssignedTo?.toString() === assignedUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Lead is already assigned to this user",
      });
    }
    lead.assignedTo = assignedUser._id;
    await lead.save();

    await Timeline.create({
      action: previousAssignedTo ? "Lead Reassigned" : "Lead Assigned",
      entityType: "Lead",
      entityId: lead._id,
      performedBy: req.user.id,
      previousValue: {
        assignedTo: previousAssignedTo,
      },
      newValue: {
        assignedTo: assignedUser._id,
        name: assignedUser.name,
        email: assignedUser.email,
      },
      description: previousAssignedTo
        ? `Lead ${lead.name} was reassigned to ${assignedUser.name}`
        : `Lead ${lead.name} was assigned to ${assignedUser.name}`,
    });

    return res.status(200).json({
      success: true,
      message: previousAssignedTo
        ? "Lead reassigned successfully"
        : "Lead assigned successfully",
      data: await Lead.findById(lead._id)
        .populate("assignedTo", "name email")
        .populate("createdBy", "name email"),
    });
  } catch (error) {
    next(error);
  }
};

export const updateLeadStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const allowedStatuses = [
      "New",
      "Contacted",
      "Qualified",
      "Unqualified",
      "Converted",
      "Lost",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead status",
      });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (
      req.user.role === "Sales Executive" &&
      lead.assignedTo?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this lead",
      });
    }

    const previousStatus = lead.status;

    if (previousStatus === status) {
      return res.status(200).json({
        success: true,
        message: "Lead status is already set to this value",
        data: lead,
      });
    }

    lead.status = status;
    await lead.save();

    await Timeline.create({
      action: "Lead Status Changed",
      entityType: "Lead",
      entityId: lead._id,
      performedBy: req.user.id,
      previousValue: {
        status: previousStatus,
      },
      newValue: {
        status: lead.status,
      },
      description: `Lead ${lead.name} status changed from ${previousStatus} to ${lead.status}`,
    });

    return res.status(200).json({
      success: true,
      message: "Lead status updated successfully",
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    await Lead.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const convertLead = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const {
      dealName,
      dealValue,
      probability,
      expectedClosingDate,
      description,
    } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    if (
      !dealName ||
      dealValue === undefined ||
      !Number.isFinite(Number(dealValue)) ||
      Number(dealValue) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Deal name and a deal value greater than zero are required",
      });
    }

    const dealProbability =
      probability === undefined ? 10 : Number(probability);

    if (
      !Number.isFinite(dealProbability) ||
      dealProbability < 0 ||
      dealProbability > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Probability must be between 0 and 100",
      });
    }

    session.startTransaction();

    const lead = await Lead.findById(id).session(session);

    if (!lead) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (
      req.user.role === "Sales Executive" &&
      lead.assignedTo?.toString() !== req.user.id
    ) {
      await session.abortTransaction();

      return res.status(403).json({
        success: false,
        message: "You are not allowed to convert this lead",
      });
    }

    if (lead.status !== "Qualified") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Only qualified leads can be converted",
      });
    }

    const [customer] = await Customer.create(
      [
        {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          originalLead: lead._id,
          assignedTo: lead.assignedTo,
        },
      ],
      { session },
    );

    const expectedRevenue = Number(dealValue) * (dealProbability / 100);

    const [deal] = await Deal.create(
      [
        {
          name: dealName,
          lead: lead._id,
          customer: customer._id,
          assignedTo: lead.assignedTo,
          value: Number(dealValue),
          probability: dealProbability,
          expectedRevenue,
          expectedClosingDate,
          description,
        },
      ],
      { session },
    );

    lead.status = "Converted";
    await lead.save({ session });

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Lead converted successfully",
      data: {
        lead,
        customer,
        deal,
      },
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    next(error);
  } finally {
    await session.endSession();
  }
};
