// routes/employeeRoutes.js
import express from "express";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
  getActiveEmployees,
} from "../controller/employeeController.js";

const router = express.Router();

// Employee routes
router.post("/", createEmployee);
router.get("/", getEmployees);
router.get("/active", getActiveEmployees); // Must be before /:id
router.get("/:id", getEmployeeById);
router.put("/:id", updateEmployee);
router.patch("/:id/toggle-status", toggleEmployeeStatus);
router.delete("/:id", deleteEmployee);

export default router;
