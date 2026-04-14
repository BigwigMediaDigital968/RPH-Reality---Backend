// controllers/propertyController.js
import mongoose from "mongoose";
import Property from "../models/Property.js";
import cloudinary from "../config/cloudinary.js";

const ALLOWED_STATUS = ["featured", "new", "hot", "premium", "standard"];

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

const getValidListingStatus = (status) => {
  if (typeof status !== "string") return "standard";

  const normalized = status.toLowerCase().trim();
  return ALLOWED_STATUS.includes(normalized) ? normalized : "standard";
};

// Helper: Extract Cloudinary public ID from URL
const getCloudinaryPublicId = (url) => {
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;

    let path = parts[1];

    // remove version (v123456/)
    path = path.replace(/^v\d+\//, "");

    // remove extension
    return path.replace(/\.[^/.]+$/, "");
  } catch (error) {
    console.error("Error extracting public ID:", error);
    return null;
  }
};

// Helper: Delete image from Cloudinary
const deleteFromCloudinary = async (url) => {
  const publicId = getCloudinaryPublicId(url);
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted image: ${publicId}`);
    } catch (error) {
      console.error(`Failed to delete image: ${publicId}`, error);
    }
  }
};

// CREATE PROPERTY
export const createProperty = async (req, res) => {
  try {
    // Parse property data from FormData
    console.log("data", req.body);
    const propertyData = JSON.parse(req.body.data);
    const imagesPayload = JSON.parse(req.body.imagesPayload || "[]");

    const { title, purpose, location } = propertyData;

    // Validation
    if (!title || !purpose || !location) {
      return res.status(400).json({
        success: false,
        message: "Title, purpose, and location are required",
      });
    }

    // Validate images payload
    if (!Array.isArray(imagesPayload)) {
      return res.status(400).json({
        success: false,
        message: "Invalid images payload",
      });
    }

    // Generate slug
    let slug = propertyData.slug || generateSlug(title);
    let slugExists = await Property.findOne({ slug });
    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(title)}-${counter}`;
      slugExists = await Property.findOne({ slug });
      counter++;
    }

    // Process images
    const uploadedFiles = req.files || [];
    const imageUrlMap = new Map();

    // Map uploaded files by their fieldname (which contains the ID)
    uploadedFiles.forEach((file) => {
      // fieldname format: "images[id]"
      const match = file.fieldname.match(/images\[(.+)\]/);
      if (match) {
        const id = match[1];
        imageUrlMap.set(id, file.path);
      }
    });

    // Reconstruct images array based on payload order
    const finalImages = imagesPayload
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        if (item.type === "new") {
          return imageUrlMap.get(item.id);
        }
        return null;
      })
      .filter(Boolean);

    // Validate at least one image
    if (finalImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required",
      });
    }

    const listingStatus = getValidListingStatus(req.body.listingStatus);

    // Create property
    const property = await Property.create({
      title: propertyData.title?.trim(),
      slug,
      description: propertyData.description?.trim() || "",
      type: propertyData.type?.trim() || "",
      purpose: propertyData.purpose,
      location: propertyData.location?.trim(),
      brochure: propertyData.brochure?.trim() || "",
      builder: propertyData.builder?.trim() || "",
      images: finalImages,
      price: propertyData.price?.trim() || "",
      bedrooms: propertyData.bedrooms?.trim() || "",
      bathrooms: propertyData.bathrooms?.trim() || "",
      areaSqft: propertyData.areaSqft?.trim() || "",
      highlights: propertyData.highlights || [],
      featuresAmenities: propertyData.featuresAmenities || [],
      nearby: propertyData.nearby || [],
      googleMapUrl: propertyData.googleMapUrl?.trim() || "",
      videoLink: propertyData.videoLink?.trim() || "",
      extraHighlights: propertyData.extraHighlights || [],
      instagramLink: propertyData.instagramLink?.trim() || "",
      extraDetails: propertyData.extraDetails?.trim() || "",
      faqs: propertyData.faqs || [],
      metatitle: propertyData.metatitle?.trim() || "",
      metadescription: propertyData.metadescription?.trim() || "",
      listingStatus: listingStatus,
    });

    return res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: property,
    });
  } catch (error) {
    console.error("Create Property Error:", error);

    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        deleteFromCloudinary(file.path);
      });
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
      message: "Failed to create property",
    });
  }
};

// UPDATE PROPERTY
export const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID",
      });
    }

    // Parse property data from FormData
    const propertyData = JSON.parse(req.body.data);
    const imagesPayload = JSON.parse(req.body.imagesPayload || "[]");

    // Get existing property
    const existingProperty = await Property.findById(id);
    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Validate images payload
    if (!Array.isArray(imagesPayload)) {
      return res.status(400).json({
        success: false,
        message: "Invalid images payload",
      });
    }

    // Process images
    const uploadedFiles = req.files || [];
    const imageUrlMap = new Map();

    // Map uploaded files by their fieldname
    uploadedFiles.forEach((file) => {
      const match = file.fieldname.match(/images\[(.+)\]/);
      if (match) {
        const id = match[1];
        imageUrlMap.set(id, file.path);
      }
    });

    // Reconstruct images array based on payload order
    const finalImages = imagesPayload
      .sort((a, b) => a.order - b.order)
      .map((item) => {
        if (item.type === "existing") {
          return item.url;
        } else if (item.type === "new") {
          return imageUrlMap.get(item.id);
        }
        return null;
      })
      .filter(Boolean);

    // Validate at least one image
    if (finalImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required",
      });
    }

    // Identify images to delete (images in DB but not in payload)
    const existingImageUrls = imagesPayload
      .filter((item) => item.type === "existing")
      .map((item) => item.url);

    const imagesToDelete = existingProperty.images.filter(
      (img) => !existingImageUrls.includes(img),
    );

    // Delete removed images from Cloudinary
    if (imagesToDelete.length > 0) {
      console.log(`Deleting ${imagesToDelete.length} removed images...`);
      for (const imageUrl of imagesToDelete) {
        await deleteFromCloudinary(imageUrl);
      }
    }

    // Update slug if title changed
    let slug = existingProperty.slug;
    if (propertyData.title && propertyData.title !== existingProperty.title) {
      if (propertyData.slug) {
        slug = propertyData.slug;
      } else {
        slug = generateSlug(propertyData.title);
        let slugExists = await Property.findOne({ slug, _id: { $ne: id } });
        let counter = 1;
        while (slugExists) {
          slug = `${generateSlug(propertyData.title)}-${counter}`;
          slugExists = await Property.findOne({ slug, _id: { $ne: id } });
          counter++;
        }
      }
    }

    const listingStatus = getValidListingStatus(propertyData.listingStatus);

    // Update property
    const property = await Property.findByIdAndUpdate(
      id,
      {
        title: propertyData.title?.trim(),
        slug,
        description: propertyData.description?.trim() || "",
        type: propertyData.type?.trim() || "",
        purpose: propertyData.purpose,
        location: propertyData.location?.trim(),
        brochure: propertyData.brochure?.trim() || "",
        builder: propertyData.builder?.trim() || "",
        images: finalImages,
        price: propertyData.price?.trim() || "",
        bedrooms: propertyData.bedrooms?.trim() || "",
        bathrooms: propertyData.bathrooms?.trim() || "",
        areaSqft: propertyData.areaSqft?.trim() || "",
        highlights: propertyData.highlights || [],
        featuresAmenities: propertyData.featuresAmenities || [],
        nearby: propertyData.nearby || [],
        googleMapUrl: propertyData.googleMapUrl?.trim() || "",
        videoLink: propertyData.videoLink?.trim() || "",
        extraHighlights: propertyData.extraHighlights || [],
        instagramLink: propertyData.instagramLink?.trim() || "",
        extraDetails: propertyData.extraDetails?.trim() || "",
        faqs: propertyData.faqs || [],
        metatitle: propertyData.metatitle?.trim() || "",
        metadescription: propertyData.metadescription?.trim() || "",
        listingStatus: listingStatus,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: property,
    });
  } catch (error) {
    console.error("Update Property Error:", error);

    // Clean up newly uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        deleteFromCloudinary(file.path);
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
      listingStatus,
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
      sale: 0,
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
{
  /**
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
}; */
}

// DELETE PROPERTY
export const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;

    validateObjectId(id);

    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.images?.length) {
      const deletePromises = property.images.map((url) => {
        return deleteFromCloudinary(url);
      });

      await Promise.all(deletePromises);
    }

    // then delete property
    await Property.findByIdAndDelete(id);

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

// Add this new function
export const uploadPropertyImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No images uploaded",
      });
    }

    // Get uploaded image URLs from Cloudinary
    const imageUrls = req.files.map((file) => file.path);

    return res.status(200).json({
      success: true,
      message: "Images uploaded successfully",
      data: imageUrls,
    });
  } catch (error) {
    console.error("Upload Images Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload images",
    });
  }
};

// Add this function to delete images from Cloudinary
export const deletePropertyImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Image URL is required",
      });
    }

    // Extract public_id from Cloudinary URL
    const urlParts = imageUrl.split("/");
    const publicIdWithExtension = urlParts[urlParts.length - 1];
    const publicId = `properties/${publicIdWithExtension.split(".")[0]}`;

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId);

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Delete Image Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete image",
    });
  }
};
