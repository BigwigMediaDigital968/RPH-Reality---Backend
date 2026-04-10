import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
    },
    experience: {
      type: String,
      default: "",
    },
    resume: {
      url: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "interviewed", "rejected", "hired"],
      default: "pending",
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const Application = mongoose.model("Application", applicationSchema);

export default Application;
