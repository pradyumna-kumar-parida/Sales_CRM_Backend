import mongoose from "mongoose";
import Timeline from "../models/Timeline.js";
import Lead from "../models/Lead.js";
import Customer from "../models/Customer.js";
import Deal from "../models/Deal.js";
import Activity from "../models/Activity.js";

const models = {
  Lead,
  Customer,
  Deal,
  Activity,
};

export const getTimeline = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!models[entityType]) {
      return res.status(400).json({
        success: false,
        message: "Invalid entity type",
      });
    }

    if (!mongoose.isValidObjectId(entityId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entity ID",
      });
    }

    const entity = await models[entityType].findById(entityId);

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: `${entityType} not found`,
      });
    }

    // Sales Executives can only access their assigned records.
    if (req.user.role === "Sales Executive") {
      const assignedUserId = entity.assignedTo?.toString();
      const currentUserId = req.user.id.toString();

      if (assignedUserId !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: "You cannot access this timeline",
        });
      }
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));

    const filter = { entityType, entityId };

    const [entries, total] = await Promise.all([
      Timeline.find(filter)
        .populate("performedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize),

      Timeline.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Timeline fetched successfully",
      data: entries,
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
