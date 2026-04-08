import express from "express";
import {
  assignLead,
  createLead,
  deleteLead,
  getLeadById,
  getLeads,
  updateLeadStatus,
} from "../controller/leadController.js";

const router = express.Router();

// Public
router.post("/", createLead);

// Admin
router.get("/", getLeads);
router.get("/:id", getLeadById);
router.put("/:id", updateLeadStatus);
router.post("/:id/assign", assignLead);

router.delete("/:id", deleteLead);

export default router;
