import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      required: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    blogImage: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },
    tags: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    // SEO Fields
    metaTitle: {
      type: String,
      trim: true,
    },
    metaDescription: {
      type: String,
      trim: true,
    },
    metaKeywords: {
      type: [String],
      default: [],
    },
    faqs: [
      {
        question: {
          type: String,
          trim: true,
        },
        answer: {
          type: String,
          trim: true,
        },
      },
    ],
    // Analytics
    views: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Index for search
blogSchema.index({ title: "text", content: "text", tags: "text" });

// Auto-generate slug
blogSchema.pre("save", async function (next) {
  if (this.isModified("title") && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
});

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;
