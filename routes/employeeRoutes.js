import express from "express";
import {
  createEmployee,
  getActiveEmployees,
  getEmployees,
} from "../controller/employeeController.js";

const router = express.Router();

// Get all employees
router.get("/", getEmployees);
router.get("/active", getActiveEmployees);
router.post("/", createEmployee);

export default router;
