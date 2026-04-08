import Employee from "../models/Employee.js";

export const createEmployee = async (req, res) => {
  try {
    const { name, email, phone, sheetId } = req.body;

    if (!name || !email || !sheetId) {
      return res.status(400).json({
        success: false,
        message: "Name, email and sheetId are required",
      });
    }

    const employee = await Employee.create({
      name: name?.trim(),
      email: email?.trim().toLowerCase(),
      phone: phone?.trim() || "",
      sheetId: sheetId?.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: employee,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
    });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true }).lean();

    return res.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
    });
  }
};

// GET EMPLOYEES (for assignment dropdown)
export const getActiveEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .select("name email phone")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error("Get Employees Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching employees",
    });
  }
};
