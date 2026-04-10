import cloudinary from "../config/cloudinary.js";
import Application from "../models/Application.js";

// @desc    Get all applications with pagination, search, and filters
// @route   GET /api/applications
// @access  Public/Private (add auth middleware as needed)
export const getApplications = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Search and filter parameters
    const search = req.query.search || "";
    const status = req.query.status || "";
    const position = req.query.position || "";
    const experience = req.query.experience || "";
    const city = req.query.city || "";
    const sortBy = req.query.sortBy || "appliedDate";
    const sortOrder = req.query.sortOrder || "desc";

    // Date range filters
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Build query
    const query = {};

    // Search across multiple fields
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { position: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by position
    if (position) {
      query.position = { $regex: position, $options: "i" };
    }

    // Filter by experience
    if (experience) {
      query.experience = experience;
    }

    // Filter by city
    if (city) {
      query.city = { $regex: city, $options: "i" };
    }

    // Filter by date range
    if (startDate || endDate) {
      query.appliedDate = {};
      if (startDate) {
        query.appliedDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.appliedDate.$lte = new Date(endDate);
      }
    }

    // Execute query with pagination
    const [applications, totalCount] = await Promise.all([
      Application.find(query)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(query),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: applications,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Get applications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
      error: error.message,
    });
  }
};

// @desc    Get single application by ID
// @route   GET /api/applications/:id
// @access  Public/Private
export const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error("Get application by ID error:", error);

    // Handle invalid MongoDB ID format
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch application",
      error: error.message,
    });
  }
};

// @desc    Create new application
// @route   POST /api/applications
// @access  Public
export const createApplication = async (req, res) => {
  try {
    // Check for validation errors

    const { name, email, phone, city, position, experience } = req.body;
    const resumeUrl = req.file.path;
    const resumePublicId = req.file.filename;

    // Create new application
    const application = await Application.create({
      name,
      email,
      phone,
      city,
      position,
      experience,
      resume: {
        url: resumeUrl,
        publicId: resumePublicId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: application,
    });
  } catch (error) {
    console.error("Create application error:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate application detected",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create application",
      error: error.message,
    });
  }
};

// @desc    Update application
// @route   PUT /api/applications/:id
// @access  Private (admin only)
export const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const application = await Application.findByIdAndUpdate(id, req.body, {
      new: true, // Return updated document
      runValidators: true, // Run schema validators
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Application updated successfully",
      data: application,
    });
  } catch (error) {
    console.error("Update application error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update application",
      error: error.message,
    });
  }
};

// @desc    Update application status
// @route   PATCH /api/applications/:id/status
// @access  Private (admin only)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = [
      "pending",
      "reviewed",
      "interviewed",
      "rejected",
      "hired",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const application = await Application.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      data: application,
    });
  } catch (error) {
    console.error("Update status error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update application status",
      error: error.message,
    });
  }
};

// @desc    Delete application
// @route   DELETE /api/applications/:id
// @access  Private (admin only)
export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }
    if (application.resume && application.resume.publicId) {
      await cloudinary.uploader.destroy(application.resume.publicId, {
        resource_type: "raw",
      });
    }

    await application.remove();

    res.status(200).json({
      success: true,
      message: "Application deleted successfully",
      data: application,
    });
  } catch (error) {
    console.error("Delete application error:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete application",
      error: error.message,
    });
  }
};

// @desc    Get application statistics
// @route   GET /api/applications/stats
// @access  Private (admin only)
export const getApplicationStats = async (req, res) => {
  try {
    const stats = await Application.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalApplications = await Application.countDocuments();

    // Get applications by position
    const positionStats = await Application.aggregate([
      {
        $group: {
          _id: "$position",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get recent applications (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentApplications = await Application.countDocuments({
      appliedDate: { $gte: thirtyDaysAgo },
    });

    res.status(200).json({
      success: true,
      data: {
        totalApplications,
        statusBreakdown: stats,
        positionBreakdown: positionStats,
        recentApplications,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch application statistics",
      error: error.message,
    });
  }
};

// @desc    Bulk update applications
// @route   PATCH /api/applications/bulk-update
// @access  Private (admin only)
export const bulkUpdateApplications = async (req, res) => {
  try {
    const { ids, update } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of application IDs",
      });
    }

    if (!update || Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide update data",
      });
    }

    const result = await Application.updateMany({ _id: { $in: ids } }, update, {
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} applications updated successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk update applications",
      error: error.message,
    });
  }
};

// @desc    Bulk delete applications
// @route   DELETE /api/applications/bulk-delete
// @access  Private (admin only)
export const bulkDeleteApplications = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of application IDs",
      });
    }

    const result = await Application.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} applications deleted successfully`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk delete applications",
      error: error.message,
    });
  }
};
