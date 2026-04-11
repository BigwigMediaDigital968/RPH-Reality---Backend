import express from "express";
import upload, { uploadBlogContentImages, uploadBlogFeaturedImage,  } from "../middleware/upload.js";
import { createBlog,
    getBlogs,
    getBlogById,
    getBlogBySlug,
    updateBlog,
    deleteBlog,
    uploadContentImage,
    getBlogStats, } from "../controller/blogController.js";


const router = express.Router();

// Image upload endpoint (for editor)
router.post("/upload-content-image", uploadBlogContentImages.single("image"), uploadContentImage);

// Blog CRUD
router.post("/", uploadBlogFeaturedImage.single("featuredImage"), createBlog);
router.get("/", getBlogs);
router.get("/stats", getBlogStats);
router.get("/slug/:slug", getBlogBySlug);
router.get("/:id", getBlogById);
router.put("/:id", uploadBlogFeaturedImage.single("featuredImage"), updateBlog);
router.delete("/:id", deleteBlog);

export default router;