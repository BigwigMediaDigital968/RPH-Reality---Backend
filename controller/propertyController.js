// controllers/propertyController.js
import mongoose from "mongoose";
import Property from "../models/Property.js";

// Validation helper
const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid ID format");
  }
};

// Sanitize input helper
const sanitizeString = (str) => {
  if (!str) return "";
  return str.trim().replace(/[<>]/g, "");
};

// Generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// CREATE PROPERTY
export const createProperty = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      purpose,
      location,
      brochure,
      builder,
      images,
      price,
      bedrooms,
      bathrooms,
      areaSqft,
      highlights,
      featuresAmenities,
      nearby,
      googleMapUrl,
      videoLink,
      extraHighlights,
      instagramLink,
      extraDetails,
      faqs,
      metatitle,
      metadescription,
    } = req.body;

    // Validation
    if (!title || !purpose || !location) {
      return res.status(400).json({
        success: false,
        message: "Title, purpose, and location are required",
      });
    }

    // Generate slug
    let slug = req.body.slug || generateSlug(title);

    // Check for duplicate slug
    let slugExists = await Property.findOne({ slug });
    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(title)}-${counter}`;
      slugExists = await Property.findOne({ slug });
      counter++;
    }

    const property = await Property.create({
      title: sanitizeString(title),
      slug,
      description: sanitizeString(description),
      type: sanitizeString(type),
      purpose: purpose.toLowerCase(),
      location: sanitizeString(location),
      brochure: sanitizeString(brochure),
      builder: sanitizeString(builder),
      images: Array.isArray(images) ? images : [],
      price: sanitizeString(price),
      bedrooms: sanitizeString(bedrooms),
      bathrooms: sanitizeString(bathrooms),
      areaSqft: sanitizeString(areaSqft),
      highlights: Array.isArray(highlights) ? highlights : [],
      featuresAmenities: Array.isArray(featuresAmenities)
        ? featuresAmenities
        : [],
      nearby: Array.isArray(nearby) ? nearby : [],
      googleMapUrl: sanitizeString(googleMapUrl),
      videoLink: sanitizeString(videoLink),
      extraHighlights: Array.isArray(extraHighlights) ? extraHighlights : [],
      instagramLink: sanitizeString(instagramLink),
      extraDetails: sanitizeString(extraDetails),
      faqs: Array.isArray(faqs) ? faqs : [],
      metatitle: sanitizeString(metatitle),
      metadescription: sanitizeString(metadescription),
    });

    return res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: property,
    });
  } catch (error) {
    console.error("Create Property Error:", error);

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
      message: "Failed to create property",
    });
  }
};

// GET ALL PROPERTIES with filtering and pagination
export const getProperties = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      purpose,
      type,
      location,
      minPrice,
      maxPrice,
      bedrooms,
      sort = "desc",
      sortBy = "createdAt",
    } = req.query;

    page = Math.max(1, parseInt(page));
    limit = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (page - 1) * limit;

    const query = {};

    // Purpose filter
    if (purpose && purpose !== "all") {
      query.purpose = purpose;
    }

    // Type filter
    if (type && type !== "all") {
      query.type = type;
    }

    // Location filter
    if (location && location !== "all") {
      query.location = { $regex: location, $options: "i" };
    }

    // Bedrooms filter
    if (bedrooms && bedrooms !== "all") {
      query.bedrooms = bedrooms;
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = sanitizeString(search);
      query.$or = [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { location: { $regex: searchTerm, $options: "i" } },
        { builder: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // Sort configuration
    const sortOrder = sort === "asc" ? 1 : -1;
    const sortConfig = { [sortBy]: sortOrder };

    const [properties, total, stats] = await Promise.all([
      Property.find(query).sort(sortConfig).skip(skip).limit(limit).lean(),
      Property.countDocuments(query),
      Property.aggregate([{ $group: { _id: "$purpose", count: { $sum: 1 } } }]),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Format stats
    const purposeStats = {
      all: total,
      buy: 0,
      rent: 0,
      lease: 0,
    };

    stats.forEach((item) => {
      purposeStats[item._id] = item.count;
    });

    return res.json({
      success: true,
      data: properties,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      stats: purposeStats,
    });
  } catch (error) {
    console.error("Get Properties Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
    });
  }
};

// GET SINGLE PROPERTY by ID
export const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const property = await Property.findById(id).lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error("Get Property Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while fetching property",
    });
  }
};

// GET PROPERTY by SLUG
export const getPropertyBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const property = await Property.findOne({ slug }).lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error("Get Property by Slug Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching property",
    });
  }
};

// UPDATE PROPERTY
export const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const updateData = { ...req.body };

    // If title is updated, regenerate slug
    if (updateData.title && !updateData.slug) {
      let newSlug = generateSlug(updateData.title);

      // Check for duplicate slug (excluding current property)
      let slugExists = await Property.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });
      let counter = 1;
      while (slugExists) {
        newSlug = `${generateSlug(updateData.title)}-${counter}`;
        slugExists = await Property.findOne({
          slug: newSlug,
          _id: { $ne: id },
        });
        counter++;
      }

      updateData.slug = newSlug;
    }

    // Sanitize string fields
    const stringFields = [
      "title",
      "description",
      "type",
      "location",
      "brochure",
      "builder",
      "price",
      "bedrooms",
      "bathrooms",
      "areaSqft",
      "googleMapUrl",
      "videoLink",
      "instagramLink",
      "extraDetails",
      "metatitle",
      "metadescription",
    ];

    stringFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        updateData[field] = sanitizeString(updateData[field]);
      }
    });

    const property = await Property.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: property,
    });
  } catch (error) {
    console.error("Update Property Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating property",
    });
  }
};

// DELETE PROPERTY
export const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const property = await Property.findByIdAndDelete(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.error("Delete Property Error:", error);

    if (error.message === "Invalid ID format") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while deleting property",
    });
  }
};

// GET UNIQUE LOCATIONS
export const getUniqueLocations = async (req, res) => {
  try {
    const locations = await Property.distinct("location");

    return res.status(200).json({
      success: true,
      data: locations.filter((loc) => loc && loc.trim() !== ""),
    });
  } catch (error) {
    console.error("Get Locations Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching locations",
    });
  }
};

// GET UNIQUE TYPES
export const getUniqueTypes = async (req, res) => {
  try {
    const types = await Property.distinct("type");

    return res.status(200).json({
      success: true,
      data: types.filter((type) => type && type.trim() !== ""),
    });
  } catch (error) {
    console.error("Get Types Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching types",
    });
  }
};
