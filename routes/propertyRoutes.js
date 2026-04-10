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
import upload from "../middleware/upload.js";

const router = express.Router();

// Property routes
const uploadDynamic = (req, res, next) => {
  console.log("Upload middleware called");
  try {
    const uploadHandler = upload.any();
    uploadHandler(req, res, (err) => {
      if (err) {
        console.log(err);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  } catch (error) {
    console.error("Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

router.post("/", uploadDynamic, createProperty);
router.get("/", getProperties);
router.get("/locations", getUniqueLocations);
router.get("/types", getUniqueTypes);
router.get("/slug/:slug", getPropertyBySlug);
router.get("/:id", getPropertyById);
router.put("/:id", uploadDynamic, updateProperty);
router.delete("/:id", deleteProperty);

export default router;
