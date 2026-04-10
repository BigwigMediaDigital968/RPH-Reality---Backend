// routes/applicationRoutes.js
import express from "express";
import {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
  getApplicationStats,
  bulkUpdateApplications,
  bulkDeleteApplications,
} from "../controller/applicationController.js";

const router = express.Router();

// Routes
router.get("/", getApplications);
router.post("/", createApplication);

router.get("/stats", getApplicationStats);

router.patch("/bulk-update", bulkUpdateApplications);

router.delete("/bulk-delete", bulkDeleteApplications);

router.get("/:id", getApplicationById);
router.put("/:id", updateApplication);
router.delete("/:id", deleteApplication);

router.patch("/:id/status", updateApplicationStatus);

export default router;
