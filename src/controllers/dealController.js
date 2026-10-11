import mongoose from "mongoose";
import Deal from "../models/Deal.js";
import Lead from "../models/Lead.js";
import Customer from "../models/Customer.js";
import User from "../models/user.js";

const stages = [
  "Qualification",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
];

const isAdmin = (user) => user.role === "Admin";
const isManager = (user) => user.role === "Sales Manager";
const isExecutive = (user) => user.role === "Sales Executive";

const canAccessDeal = (deal, user) => {
  if (isAdmin(user) || isManager(user)) return true;

  return (
    isExecutive(user) && deal.assignedTo?.toString() === user._id.toString()
  );
};

export const createDeal = async (req, res, next) => {
  try {
    const {
      name,
      lead,
      customer,
      assignedTo,
      value,
      probability = 10,
      expectedClosingDate,
      stage = "Qualification",
      description,
      lostReason,
    } = req.body;

    if (!name || !lead || !customer || value === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, lead, customer and value are required",
      });
    }

    if (
      !mongoose.isValidObjectId(lead) ||
      !mongoose.isValidObjectId(customer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead or customer ID",
      });
    }

    const amount = Number(value);
    const chance = Number(probability);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Deal value must be greater than zero",
      });
    }

    if (!Number.isFinite(chance) || chance < 0 || chance > 100) {
      return res.status(400).json({
        success: false,
        message: "Probability must be between 0 and 100",
      });
    }

    if (!stages.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deal stage",
      });
    }

    if (stage === "Lost" && !lostReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Lost reason is required",
      });
    }

    if (stage === "Won" && (amount <= 0 || chance !== 100)) {
      return res.status(400).json({
        success: false,
        message: "A Won deal must have a positive value and 100% probability",
      });
    }

    if (expectedClosingDate && Number.isNaN(Date.parse(expectedClosingDate))) {
      return res.status(400).json({
        success: false,
        message: "Invalid expected closing date",
      });
    }

    const [leadDoc, customerDoc] = await Promise.all([
      Lead.findById(lead),
      Customer.findById(customer),
    ]);

    if (!leadDoc || !customerDoc) {
      return res.status(404).json({
        success: false,
        message: "Lead or customer not found",
      });
    }

    if (customerDoc.originalLead.toString() !== leadDoc._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Customer does not belong to the selected lead",
      });
    }

    if (isExecutive(req.user)) {
      if (
        leadDoc.assignedTo?.toString() !== req.user._id.toString() ||
        customerDoc.assignedTo?.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You can create deals only for your assigned records",
        });
      }
    }

    const employeeId = assignedTo || leadDoc.assignedTo;

    if (
      isExecutive(req.user) &&
      employeeId?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot assign a deal to another employee",
      });
    }

    if (employeeId) {
      if (!mongoose.isValidObjectId(employeeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID",
        });
      }

      const employee = await User.findOne({
        _id: employeeId,
        isActive: true,
        role: "Sales Executive",
      });

      if (!employee) {
        return res.status(400).json({
          success: false,
          message: "Assigned user must be an active Sales Executive",
        });
      }
    }

    const deal = await Deal.create({
      name,
      lead,
      customer,
      assignedTo: employeeId || null,
      value: amount,
      probability: chance,
      expectedRevenue: (amount * chance) / 100,
      expectedClosingDate,
      stage,
      description,
      lostReason,
    });

    return res.status(201).json({
      success: true,
      message: "Deal created successfully",
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

export const getDeals = async (req, res, next) => {
  try {
    const {
      search,
      stage,
      assignedTo,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      page,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = {};

    if (isExecutive(req.user)) {
      filter.assignedTo = req.user._id;
    } else if (assignedTo) {
      if (!mongoose.isValidObjectId(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID",
        });
      }
      filter.assignedTo = assignedTo;
    }

    if (stage) {
      if (!stages.includes(stage)) {
        return res.status(400).json({
          success: false,
          message: "Invalid deal stage",
        });
      }
      filter.stage = stage;
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      filter.value = {};

      if (minAmount !== undefined) {
        filter.value.$gte = Number(minAmount);
      }

      if (maxAmount !== undefined) {
        filter.value.$lte = Number(maxAmount);
      }

      if (
        Object.values(filter.value).some((v) => !Number.isFinite(v)) ||
        (filter.value.$gte !== undefined && filter.value.$gte < 0) ||
        (filter.value.$lte !== undefined && filter.value.$lte < 0) ||
        (filter.value.$gte !== undefined &&
          filter.value.$lte !== undefined &&
          filter.value.$gte > filter.value.$lte)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid amount range",
        });
      }
    }

    if (startDate || endDate) {
      filter.expectedClosingDate = {};

      if (startDate) {
        const start = new Date(startDate);
        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }
        filter.expectedClosingDate.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }
        filter.expectedClosingDate.$lte = end;
      }

      if (
        filter.expectedClosingDate.$gte &&
        filter.expectedClosingDate.$lte &&
        filter.expectedClosingDate.$gte > filter.expectedClosingDate.$lte
      ) {
        return res.status(400).json({
          success: false,
          message: "Start date must not be after end date",
        });
      }
    }

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.name = { $regex: safeSearch, $options: "i" };
    }

    const allowedSortFields = [
      "name",
      "value",
      "probability",
      "expectedClosingDate",
      "stage",
      "createdAt",
    ];

    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sort field",
      });
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
    const sortOrder = order === "asc" ? 1 : -1;

    const [deals, total] = await Promise.all([
      Deal.find(filter)
        .populate("lead", "name email")
        .populate("customer", "name email company")
        .populate("assignedTo", "name email")
        .sort({ [sortBy]: sortOrder })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize),
      Deal.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      message: "Deals fetched successfully",
      data: deals,
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

export const getDealById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deal ID",
      });
    }

    const deal = await Deal.findById(req.params.id)
      .populate("lead", "name email")
      .populate("customer", "name email company")
      .populate("assignedTo", "name email");

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    if (!canAccessDeal(deal, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this deal",
      });
    }

    return res.json({
      success: true,
      message: "Deal fetched successfully",
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDeal = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deal ID",
      });
    }

    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    if (!canAccessDeal(deal, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You cannot update this deal",
      });
    }

    if (["Won", "Lost"].includes(deal.stage)) {
      return res.status(400).json({
        success: false,
        message: "Closed deals cannot be edited through this endpoint",
      });
    }

    const allowedFields = [
      "name",
      "value",
      "probability",
      "expectedClosingDate",
      "description",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        deal[field] = req.body[field];
      }
    }

    if (!deal.name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Deal name is required",
      });
    }

    if (!Number.isFinite(deal.value) || deal.value <= 0) {
      return res.status(400).json({
        success: false,
        message: "Deal value must be greater than zero",
      });
    }

    if (
      !Number.isFinite(deal.probability) ||
      deal.probability < 0 ||
      deal.probability > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Probability must be between 0 and 100",
      });
    }

    if (
      deal.expectedClosingDate &&
      Number.isNaN(new Date(deal.expectedClosingDate).getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid expected closing date",
      });
    }

    deal.expectedRevenue = (deal.value * deal.probability) / 100;

    await deal.save();

    return res.json({
      success: true,
      message: "Deal updated successfully",
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDealStage = async (req, res, next) => {
  try {
    const { stage, lostReason } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deal ID",
      });
    }

    if (!stages.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deal stage",
      });
    }

    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    if (!canAccessDeal(deal, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You cannot update this deal",
      });
    }

    if (["Won", "Lost"].includes(deal.stage)) {
      return res.status(400).json({
        success: false,
        message: "A closed deal cannot be reopened",
      });
    }

    if (stage === "Won") {
      if (!deal.name?.trim() || deal.value <= 0) {
        return res.status(400).json({
          success: false,
          message: "A Won deal must have valid name and value",
        });
      }

      deal.probability = 100;
      deal.lostReason = "";
    }

    if (stage === "Lost") {
      if (!lostReason?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Lost reason is required",
        });
      }

      deal.lostReason = lostReason.trim();
    }

    deal.stage = stage;
    deal.expectedRevenue = (deal.value * deal.probability) / 100;

    await deal.save();

    return res.json({
      success: true,
      message: "Deal stage updated successfully",
      data: deal,
    });
  } catch (error) {
    next(error);
  }
};
