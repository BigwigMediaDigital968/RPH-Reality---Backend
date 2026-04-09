// models/Property.js
import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      default: "",
    },
    purpose: {
      type: String,
      enum: ["buy", "rent", "lease"],
      required: true,
    },
    location: { type: String, required: true },
    brochure: { type: String, default: "" },
    builder: { type: String, default: "" },
    images: { type: [String], default: [] },
    price: { type: String, default: "" },
    bedrooms: { type: String, default: "" },
    bathrooms: { type: String, default: "" },
    areaSqft: { type: String, default: "" },
    highlights: { type: [String], default: [] },
    featuresAmenities: { type: [String], default: [] },
    nearby: { type: [String], default: [] },
    googleMapUrl: { type: String, default: "" },
    videoLink: { type: String, default: "" },
    extraHighlights: { type: [String], default: [] },
    instagramLink: { type: String, default: "" },
    extraDetails: { type: String, default: "" },
    faqs: [
      {
        question: { type: String, default: "" },
        answer: { type: String, default: "" },
      },
    ],
    metatitle: { type: String, default: "" },
    metadescription: { type: String, default: "" },
  },
  { timestamps: true },
);

const Property = mongoose.model("Property", propertySchema);
export default Property;
