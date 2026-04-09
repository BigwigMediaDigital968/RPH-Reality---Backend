// routes/propertyRoutes.js
import express from "express";
import {
  createProperty,
  getProperties,
  getPropertyById,
  getPropertyBySlug,
  updateProperty,
  deleteProperty,
  getUniqueLocations,
  getUniqueTypes,
} from "../controller/propertyController.js";

const router = express.Router();

// Property routes
router.post("/", createProperty);
router.get("/", getProperties);
router.get("/locations", getUniqueLocations);
router.get("/types", getUniqueTypes);
router.get("/slug/:slug", getPropertyBySlug);
router.get("/:id", getPropertyById);
router.put("/:id", updateProperty);
router.delete("/:id", deleteProperty);

export default router;
