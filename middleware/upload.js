import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import crypto from "crypto";
import { access } from "fs";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // 🖼️ Images (KEEP SAME BEHAVIOR)
    if (file.fieldname.startsWith("images")) {
      return {
        folder: "RPH/properties",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      };
    }

    // 📄 Brochure (NEW)
    if (file.fieldname === "brochure") {
      const cleanName = file.originalname.replace(/\s+/g, "_").split(".")[0];

      return {
        folder: "RPH/properties/brochures",
        resource_type: "raw", // IMPORTANT for pdf
        type: "upload",
        format: "pdf",
        access_mode: "public",
        public_id: `brochure_${cleanName}_${Date.now()}`,
      };
    }
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 20,
  },
  fileFilter: (req, file, cb) => {
    // 🖼️ Images (NO CHANGE in logic)
    if (file.fieldname.startsWith("images")) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      return allowed.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error("Only image files are allowed"));
    }

    // 📄 Brochure
    if (file.fieldname === "brochure") {
      const allowed = ["application/pdf"];
      return allowed.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error("Only PDF allowed"));
    }

    // ❌ Reject anything else
    cb(new Error(`Unexpected field: ${file.fieldname}`));
  },
});

const resumeStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const cleanName = file.originalname.replace(/\s+/g, "_").split(".")[0];
    return {
      folder: "RPH/resumes",
      resource_type: "raw",
      type: "upload",
      format: "pdf",
      access_mode: "public",
      public_id: `resume_${cleanName}_${crypto.randomUUID()}`,
    };
  },
});

export const uploadResume = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExtensions = ["pdf", "doc", "docx"];
    const ext = file.originalname.split(".").pop();
    if (allowed.includes(file.mimetype) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF/DOC/DOCX allowed"));
    }
  },
});

const blogFeaturedStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const cleanName = file.originalname.replace(/\s+/g, "_").split(".")[0];

    return {
      folder: "RPH/blogs/images",
      resource_type: "image",
      type: "upload",
      access_mode: "public",

      public_id: `property_${cleanName}_${Date.now()}`,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    };
  },
});
const blogContentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "RPH/blogs/content",
      resource_type: "image",
      type: "upload",
      access_mode: "public",

      public_id: `blog_content_${Date.now()}`,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    };
  },
});

export const uploadBlogFeaturedImage = multer({
  storage: blogFeaturedStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export const uploadBlogContentImages = multer({
  storage: blogContentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted image: ${publicId}`);
  } catch (error) {
    console.error(`Failed to delete image from Cloudinary:`, error);
  }
};

export default upload;
