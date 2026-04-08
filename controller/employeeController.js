import mongoose from "mongoose";
import Employee from "../models/Employee.js";

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

// CREATE EMPLOYEE
export const createEmployee = async (req, res) => {
  try {
    const { name, email, phone, sheetId } = req.body;

    // Validation
    if (!name || !email || !sheetId) {
      return res.status(400).json({
        success: false,
        message: "Name, email and sheetId are required",
      });
    }

    // Check for duplicate email
    const existingEmployee = await Employee.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: "Employee with this email already exists",
      });
    }

    // Check for duplicate sheetId
    const existingSheetId = await Employee.findOne({
      sheetId: sheetId.trim(),
    });

    if (existingSheetId) {
      return res.status(409).json({
        success: false,
        message: "Sheet ID already in use",
      });
    }

    const employee = await Employee.create({
      name: sanitizeString(name),
      email: sanitizeString(email).toLowerCase(),
      phone: sanitizeString(phone),
      sheetId: sanitizeString(sheetId),
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Create Employee Error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create employee",
    });
  }
};

// GET ALL EMPLOYEES with filtering and pagination
export const getEmployees = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      isActive,
      sort = "desc",
      sortBy = "createdAt",
    } = req.query;

    page = Math.max(1, parseInt(page));
    limit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (page - 1) * limit;

    const query = {};

    // Active/Inactive filter
    if (isActive !== undefined && isActive !== "all") {
      query.isActive = isActive === "true";
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = sanitizeString(search);
      query.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { phone: { $regex: searchTerm, $options: "i" } },
        { sheetId: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Sort configuration
    const sortOrder = sort === "asc" ? 1 : -1;
    const sortConfig = { [sortBy]: sortOrder };

    const [employees, total, stats] = await Promise.all([
      Employee.find(query).sort(sortConfig).skip(skip).limit(limit).lean(),
      Employee.countDocuments(query),
      Employee.aggregate([
        { $group: { _id: "$isActive", count: { $sum: 1 } } },
      ]),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Format stats
    const activeStats = {
      all: 0,
      active: 0,
      inactive: 0,
    };

    stats.forEach((item) => {
      if (item._id) {
        activeStats.active = item.count;
      } else {
        activeStats.inactive = item.count;
      }
    });
    activeStats.all = activeStats.active + activeStats.inactive;

    return res.json({
      success: true,
      data: employees,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats: activeStats,
    });
  } catch (error) {
    console.error("Get Employees Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
    });
  }
};

// GET SINGLE EMPLOYEE
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const employee = await Employee.findById(id).lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Get Employee Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while fetching employee",
    });
  }
};

// UPDATE EMPLOYEE
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, sheetId } = req.body;

    validateObjectId(id);

    const updateData = {};

    if (name) updateData.name = sanitizeString(name);
    if (phone !== undefined) updateData.phone = sanitizeString(phone);
    if (sheetId) updateData.sheetId = sanitizeString(sheetId);

    // Email update with duplicate check
    if (email) {
      // Check if email is already used by another employee
      const existingEmployee = await Employee.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: id },
      });

      if (existingEmployee) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another employee",
        });
      }

      updateData.email = sanitizeString(email).toLowerCase();
    }

    // SheetId update with duplicate check
    if (sheetId) {
      const existingSheetId = await Employee.findOne({
        sheetId: sheetId.trim(),
        _id: { $ne: id },
      });

      if (existingSheetId) {
        return res.status(409).json({
          success: false,
          message: "Sheet ID already in use",
        });
      }
    }

    const employee = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Update Employee Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating employee",
    });
  }
};

// TOGGLE EMPLOYEE STATUS (Activate/Deactivate)
export const toggleEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    employee.isActive = !employee.isActive;
    await employee.save();

    return res.status(200).json({
      success: true,
      message: `Employee ${employee.isActive ? "activated" : "deactivated"} successfully`,
      data: employee,
    });
  } catch (error) {
    console.error("Toggle Employee Status Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating employee status",
    });
  }
};

// DELETE EMPLOYEE (Soft delete by setting isActive to false)
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const employee = await Employee.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee deactivated successfully",
      data: employee,
    });
  } catch (error) {
    console.error("Delete Employee Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while deleting employee",
    });
  }
};

// GET ACTIVE EMPLOYEES (for assignment dropdown)
export const getActiveEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .select("name email phone sheetId")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error("Get Active Employees Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching employees",
    });
  }
};
