import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import Lead from "../models/Lead.js";
import User from "../models/user.js";
import Deal from "../models/Deal.js";

export const createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, company, address, originalLead, assignedTo } =
      req.body;

    if (!name || !originalLead) {
      return res.status(400).json({
        success: false,
        message: "Customer name and originalLead are required",
      });
    }

    if (!mongoose.isValidObjectId(originalLead)) {
      return res.status(400).json({
        success: false,
        message: "Invalid original lead ID",
      });
    }

    const lead = await Lead.findById(originalLead);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Original lead not found",
      });
    }

    if (
      req.user.role === "Sales Executive" &&
      String(lead.assignedTo) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You can create a customer only from your assigned lead",
      });
    }

    let customerAssignedTo = lead.assignedTo || null;

    if (assignedTo !== undefined) {
      if (!mongoose.isValidObjectId(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID",
        });
      }

      if (
        req.user.role === "Sales Executive" &&
        String(assignedTo) !== String(req.user._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "You cannot assign customers to another user",
        });
      }

      const user = await User.findOne({
        _id: assignedTo,
        role: "Sales Executive",
        isActive: true,
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Assigned user must be an active Sales Executive",
        });
      }

      customerAssignedTo = user._id;
    }

    const customer = await Customer.create({
      name,
      email,
      phone,
      company,
      address,
      originalLead: lead._id,
      assignedTo: customerAssignedTo,
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomers = async (req, res, next) => {
  try {
    const { search, status, page, limit = 10 } = req.query;

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 10));

    const filter = {};

    if (req.user.role === "Sales Executive") {
      filter.assignedTo = req.user.id;
    }

    if (status) {
      if (!["Active", "Inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer status",
        });
      }

      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );

      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { company: searchRegex },
        { phone: searchRegex },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .populate("assignedTo", "name email")
        .populate("originalLead", "name email status")
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageLimit)
        .limit(pageLimit),

      Customer.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: customers.length,
      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
      },
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id)
      .populate("assignedTo", "name email")
      .populate("originalLead", "name email status");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (
      req.user.role === "Sales Executive" &&
      customer.assignedTo?._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this customer",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (
      req.user.role === "Sales Executive" &&
      customer.assignedTo?.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this customer",
      });
    }

    const allowedFields = ["name", "email", "phone", "company", "address"];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    }

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive",
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (!["Admin", "Sales Manager"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to change customer status",
      });
    }

    customer.status = status;
    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer status updated successfully",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const existingDeal = await Deal.findOne({ customer: id });

    if (existingDeal) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete this customer because associated deals exist",
      });
    }

    await Customer.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
