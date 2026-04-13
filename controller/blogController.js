import mongoose from "mongoose";
import Blog from "../models/Blog.js";
import {
  uploadBlogContentImages,
  uploadBlogFeaturedImage,
  deleteFromCloudinary,
} from "../middleware/upload.js";

// Helper: Generate slug
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Helper: Sanitize HTML (basic XSS prevention)
const sanitizeHTML = (html) => {
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/g, "")
    .replace(/on\w+='[^']*'/g, "");
};

// Helper: Generate FAQ Schema
const generateFAQSchema = (faqs) => {
  if (!faqs || faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
};

// UPLOAD BLOG CONTENT IMAGE
export const uploadContentImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    //const result = await uploadBlogContentImages(req.file);

    return res.status(200).json({
      success: true,
      data: {
        url: req.file.path,
        public_id: req.file.filename,
      },
    });
  } catch (error) {
    console.error("Upload Content Image Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload image",
    });
  }
};

// CREATE BLOG
export const createBlog = async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      tags,
      category,
      status,
      metaTitle,
      metaDescription,
      metaKeywords,
      faqs,
    } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    // Generate slug
    let slug = generateSlug(title);
    let slugExists = await Blog.findOne({ slug });
    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(title)}-${counter}`;
      slugExists = await Blog.findOne({ slug });
      counter++;
    }

    // Sanitize content
    const sanitizedContent = await sanitizeHTML(content);

    // Handle featured image upload
    let blogImage = { url: "", publicId: "" };
    if (req.file) {
      blogImage = {
        url: req.file.path,
        publicId: req.file.filename,
      };
    }

    // Parse arrays if they're strings
    const parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags || [];
    const parsedMetaKeywords =
      typeof metaKeywords === "string"
        ? JSON.parse(metaKeywords)
        : metaKeywords || [];
    const parsedFaqs = typeof faqs === "string" ? JSON.parse(faqs) : faqs || [];

    // Create blog
    const blog = await Blog.create({
      title: title.trim(),
      slug,
      content: sanitizedContent,
      excerpt: excerpt?.trim() || "",
      blogImage,
      tags: parsedTags,
      category: category?.trim() || "",
      status: status || "draft",
      metaTitle: metaTitle?.trim() || title.trim(),
      metaDescription: metaDescription?.trim() || excerpt?.trim() || "",
      metaKeywords: parsedMetaKeywords,
      faqs: parsedFaqs,
      publishedAt: status === "published" ? new Date() : null,
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Create Blog Error:", error);

    // Clean up uploaded image on error
    if (req.file && error.blogImage?.publicId) {
      await deleteFromCloudinary(error.blogImage.publicId);
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map((e) => e.message)
          .join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create blog",
    });
  }
};

// GET ALL BLOGS
export const getBlogs = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      tags,
      sort = "desc",
      sortBy = "createdAt",
    } = req.query;

    page = Math.max(1, parseInt(page));
    limit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (page - 1) * limit;

    const query = {};

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    // Category filter
    if (category && category !== "all") {
      query.category = category;
    }

    // Tags filter
    if (tags) {
      const tagArray = typeof tags === "string" ? tags.split(",") : tags;
      query.tags = { $in: tagArray };
    }

    // Search filter (title, content, tags)
    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }

    // Sort configuration
    const sortOrder = sort === "asc" ? 1 : -1;
    const sortConfig = { [sortBy]: sortOrder };

    const [blogs, total, categories, allTags] = await Promise.all([
      Blog.find(query)
        .select("-content") // Exclude content for list view
        .sort(sortConfig)
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments(query),
      Blog.distinct("category"),
      Blog.distinct("tags"),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data: blogs,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        categories: categories.filter((c) => c),
        tags: allTags.filter((t) => t),
      },
    });
  } catch (error) {
    console.error("Get Blogs Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blogs",
    });
  }
};

// GET SINGLE BLOG BY ID
export const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID",
      });
    }

    const blog = await Blog.findById(id).lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Generate FAQ schema
    const faqSchema = generateFAQSchema(blog.faqs);

    return res.status(200).json({
      success: true,
      data: {
        ...blog,
        faqSchema,
      },
    });
  } catch (error) {
    console.error("Get Blog Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching blog",
    });
  }
};

// GET SINGLE BLOG BY SLUG
export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOneAndUpdate(
      { slug, status: "published" },
      { $inc: { views: 1 } }, // Increment views
      { new: true },
    ).lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Generate FAQ schema
    const faqSchema = generateFAQSchema(blog.faqs);

    return res.status(200).json({
      success: true,
      data: {
        ...blog,
        faqSchema,
      },
    });
  } catch (error) {
    console.error("Get Blog by Slug Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching blog",
    });
  }
};

// UPDATE BLOG
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID",
      });
    }

    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const {
      title,
      content,
      excerpt,
      tags,
      category,
      status,
      metaTitle,
      metaDescription,
      metaKeywords,
      faqs,
      removeFeaturedImage,
    } = req.body;

    const updateData = {};

    if (title) {
      updateData.title = title.trim();
      // Regenerate slug if title changed
      let newSlug = generateSlug(title);
      let slugExists = await Blog.findOne({ slug: newSlug, _id: { $ne: id } });
      let counter = 1;
      while (slugExists) {
        newSlug = `${generateSlug(title)}-${counter}`;
        slugExists = await Blog.findOne({ slug: newSlug, _id: { $ne: id } });
        counter++;
      }
      updateData.slug = newSlug;
    }

    if (content) {
      updateData.content = await sanitizeHTML(content);
      console.log(content);
      console.log(updateData.content);
    }

    if (excerpt !== undefined) updateData.excerpt = excerpt.trim();
    if (category !== undefined) updateData.category = category.trim();
    if (status) {
      updateData.status = status;
      // Set publishedAt when publishing
      if (status === "published" && !existingBlog.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    if (metaTitle !== undefined) updateData.metaTitle = metaTitle.trim();
    if (metaDescription !== undefined)
      updateData.metaDescription = metaDescription.trim();

    // Parse arrays
    if (tags !== undefined) {
      updateData.tags = typeof tags === "string" ? JSON.parse(tags) : tags;
    }
    if (metaKeywords !== undefined) {
      updateData.metaKeywords =
        typeof metaKeywords === "string"
          ? JSON.parse(metaKeywords)
          : metaKeywords;
    }
    if (faqs !== undefined) {
      updateData.faqs = typeof faqs === "string" ? JSON.parse(faqs) : faqs;
    }

    // Handle featured image update
    if (req.file) {
      // Delete old image
      if (existingBlog.blogImage?.publicId) {
        await deleteFromCloudinary(existingBlog.blogImage.publicId);
      }
      // Upload new image
      updateData.blogImage = await uploadBlogFeaturedImage(req.file.buffer);
    } else if (removeFeaturedImage === "true") {
      // Remove featured image
      if (existingBlog.blogImage?.publicId) {
        await deleteFromCloudinary(existingBlog.blogImage.publicId);
      }
      updateData.blogImage = { url: "", publicId: "" };
    }

    const blog = await Blog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    console.error("Update Blog Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating blog",
    });
  }
};

// DELETE BLOG
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID",
      });
    }

    const blog = await Blog.findByIdAndDelete(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Delete featured image from Cloudinary
    if (blog.blogImage?.publicId) {
      await deleteFromCloudinary(blog.blogImage.publicId);
    }

    // Note: Content images are not deleted to avoid breaking old content
    // You can implement a cleanup job to remove unused images

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Delete Blog Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting blog",
    });
  }
};

// GET BLOG STATS
export const getBlogStats = async (req, res) => {
  try {
    const [totalBlogs, publishedBlogs, draftBlogs, totalViews] =
      await Promise.all([
        Blog.countDocuments(),
        Blog.countDocuments({ status: "published" }),
        Blog.countDocuments({ status: "draft" }),
        Blog.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        total: totalBlogs,
        published: publishedBlogs,
        draft: draftBlogs,
        totalViews: totalViews[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Get Blog Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching stats",
    });
  }
};
