import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    purpose: {
      type: String,
      enum: ["buy", "sell", "rent", "invest", "others"],
      default: "",
    },
    note: {
      type: String,
      default: "",
    },
    adminNote: {
      type: String,
      default: "",
    },

    // Lead lifecycle
    status: {
      type: String,
      enum: ["new", "assigned", "contacted", "closed"],
      default: "new",
    },

    // Assignment system
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    assignedAt: Date,

    // 🔥 Tracking
    source: {
      type: String,
      default: "website",
    },

    // 🔥 External sync tracking
    sheetSynced: {
      type: Boolean,
      default: false,
    },

    sheetRowId: {
      type: String, // optional tracking if needed
    },
  },
  { timestamps: true },
);

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;
