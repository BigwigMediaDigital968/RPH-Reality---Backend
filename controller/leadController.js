import mongoose from "mongoose";
import { ALLOWED_STATUSES } from "../constants.js";
import Employee from "../models/Employee.js";
import Lead from "../models/Lead.js";

// Validation helper
const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid ID format");
  }
};

// Sanitize input helper
const sanitizeString = (str) => {
  if (!str) return "";
  return str.trim().replace(/[<>]/g, "");
};

// CREATE
export const createLead = async (req, res) => {
  try {
    const { name, phone, email, city, purpose, note } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required",
      });
    }

    // Check for duplicate phone
    const existingLead = await Lead.findOne({
      phone: phone.trim(),
      status: { $ne: "closed" },
    });

    if (existingLead) {
      return res.status(409).json({
        success: false,
        message: "Lead with this phone number already exists",
      });
    }

    const lead = await Lead.create({
      name: sanitizeString(name),
      phone: phone.trim(),
      email: email ? sanitizeString(email).toLowerCase() : "",
      city: sanitizeString(city),
      purpose: purpose?.trim().toLowerCase() || "",
      note: sanitizeString(note),
    });

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Create Lead Error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating lead",
    });
  }
};

// GET ALL with advanced filtering
export const getLeads = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      status,
      search,
      sort = "desc",
      sortBy = "createdAt",
      purpose,
      assignedTo,
      startDate,
      endDate,
    } = req.query;

    page = Math.max(1, parseInt(page));
    limit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (page - 1) * limit;

    const query = {};

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    // Purpose filter
    if (purpose && purpose !== "all") {
      query.purpose = purpose;
    }

    // Assigned to filter
    if (assignedTo) {
      if (assignedTo === "unassigned") {
        query.assignedTo = null;
      } else if (mongoose.Types.ObjectId.isValid(assignedTo)) {
        query.assignedTo = assignedTo;
      }
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = sanitizeString(search);
      query.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { phone: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { city: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Sort configuration
    const sortOrder = sort === "asc" ? 1 : -1;
    const sortConfig = { [sortBy]: sortOrder };

    const [leads, total, statusCounts] = await Promise.all([
      Lead.find(query)
        .sort(sortConfig)
        .skip(skip)
        .limit(limit)
        .populate("assignedTo", "name email phone")
        .lean(),
      Lead.countDocuments(query),
      Lead.aggregate([
        { $match: search ? query : {} },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Format status counts
    const stats = {
      all: total,
      new: 0,
      assigned: 0,
      contacted: 0,
      closed: 0,
    };

    statusCounts.forEach((item) => {
      stats[item._id] = item.count;
    });

    return res.status(200).json({
      success: true,
      data: leads,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats,
    });
  } catch (error) {
    console.error("Get Leads Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching leads",
    });
  }
};

// GET SINGLE LEAD
export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const lead = await Lead.findById(id)
      .populate("assignedTo", "name email phone")
      .lean();

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Get Lead Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while fetching lead",
    });
  }
};

// UPDATE LEAD
export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, city, purpose, note, adminNote } = req.body;

    validateObjectId(id);

    const updateData = {};

    if (name) updateData.name = sanitizeString(name);
    if (phone) updateData.phone = phone.trim();
    if (email !== undefined)
      updateData.email = email ? sanitizeString(email).toLowerCase() : "";
    if (city !== undefined) updateData.city = sanitizeString(city);
    if (purpose) updateData.purpose = purpose.trim().toLowerCase();
    if (note !== undefined) updateData.note = sanitizeString(note);
    if (adminNote !== undefined)
      updateData.adminNote = sanitizeString(adminNote);

    const lead = await Lead.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("assignedTo", "name email");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Update Lead Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating lead",
    });
  }
};

// UPDATE STATUS
export const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;

    validateObjectId(id);

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    status = status.trim().toLowerCase();

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    ).populate("assignedTo", "name email");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Update Lead Status Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// DELETE
export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error("Delete Lead Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Delete failed",
    });
  }
};

// ASSIGN LEAD
export const assignLead = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const { id } = req.params;

    if (!employeeId || !id) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and Lead ID are required",
      });
    }

    validateObjectId(id);
    validateObjectId(employeeId);

    const employee = await Employee.findById(employeeId);
    if (!employee || !employee.isActive) {
      return res.status(404).json({
        success: false,
        message: "Employee not found or inactive",
      });
    }

    const lead = await Lead.findByIdAndUpdate(
      id,
      {
        assignedTo: employee._id,
        assignedAt: new Date(),
        status: "assigned",
      },
      { new: true },
    ).populate("assignedTo", "name email phone");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // TODO: Send to Google Sheet functionality
    // await sendToGoogleSheet(lead, employee);

    return res.json({
      success: true,
      message: "Lead assigned successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Assign Lead Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Assignment failed",
    });
  }
};
