import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import crypto from "crypto";
import { access } from "fs";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "RPH/properties",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    };
  },
});

const upload = multer({
  storage: storage,
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

export default upload;
