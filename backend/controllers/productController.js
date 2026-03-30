const Product = require("../models/Product");
const Seller = require("../models/Seller");
const SubCategory = require("../models/SubCategory");
const MasterProduct = require("../models/MasterProduct");
const { s3 } = require("../middleware/multerConfig");
const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");

// 🌟 Helper: CloudFront URL logic
const formatProductMedia = (product) => {
  const CF_URL = process.env.CLOUDFRONT_URL;
  const doc = product.toObject ? product.toObject() : product;

  return {
    ...doc,
    images: (doc.images || []).map((img) =>
      img && img.startsWith("http") ? img : CF_URL + img,
    ),
    video: doc.video
      ? doc.video.startsWith("http")
        ? doc.video
        : CF_URL + doc.video
      : "",
  };
};

// 🌟 1. CREATE PRODUCT (Mapping with Master Catalog)
exports.createProduct = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    const seller = await Seller.findById(sellerId);
    if (!seller)
      return res
        .status(404)
        .json({ success: false, message: "Seller not found" });

    const { masterProductId, price, mrp, stock } = req.body;

    // 🔥 FIX: Fetching HSN/GST from MasterProduct via Populate
    const masterData =
      await MasterProduct.findById(masterProductId).populate("hsnMasterId");
    if (!masterData)
      return res
        .status(400)
        .json({ success: false, message: "Invalid Master Product selection" });

    const images =
      req.files && req.files["images"]
        ? req.files["images"].map((f) => f.key)
        : [];
    const video =
      req.files && req.files["video"] ? req.files["video"][0].key : "";

    const product = new Product({
      ...req.body,
      masterProductId: masterProductId,
      name: req.body.name,
      isFreeDelivery:
        req.body.isFreeDelivery === "true" || req.body.isFreeDelivery === true,
      category: masterData.category,
      subCategory: masterData.subCategory,
      hsnCode: masterData.hsnMasterId.hsnCode, // Copied from HSN Master
      gstPercentage: masterData.hsnMasterId.gstRate, // Copied from HSN Master
      discountPercentage:
        mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
      images,
      video,
      seller: sellerId,
      isMaster: false,
      isApproved: true,
      variants: req.body.variants
        ? typeof req.body.variants === "string"
          ? JSON.parse(req.body.variants)
          : req.body.variants
        : [],
      averageRating: (Math.random() * (5 - 3) + 3).toFixed(1),
    });

    await product.save();
    res.status(201).json({
      success: true,
      message: "Product created successfully!",
      data: product,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.requestNewProduct = async (req, res) => {
  try {
    const { name, category, subCategory } = req.body;
    const sellerId = req.user?.id; // Logged-in seller id

    const newRequest = new MasterProduct({
      name,
      category,
      subCategory,
      seller: sellerId,
      isApproved: false,
      status: "pending",
    });

    await newRequest.save();
    res.status(201).json({
      success: true,
      message: "Product Name request sent to Admin!",
      data: newRequest,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const { category, subCategory, search, page = 1, limit = 50 } = req.query;

    // 🌟 THE CRITICAL FILTER: Product strictly active-ah irukkanum
    // Seller 'active' status populate 'match'-la handle aagudhu
    let query = { status: "active" }; 

    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;
    if (search) query.name = { $regex: search, $options: "i" };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(query)
      .populate("category subCategory", "name image")
      .populate({
        path: "seller",
        match: { status: "active" }, // Only active sellers
        select: "shopName name address status",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // 🛡️ Filter: Seller inactive-na populate 'null' varum, so andha products-ah remove panrom
    const filteredProducts = products.filter((p) => p.seller !== null);
    
    const data = filteredProducts.map((p) => ({
      ...formatProductMedia(p),
      stock: p.stock !== undefined ? p.stock : 0,
      price: p.price || 99,
      mrp: p.mrp || 150,
      // 📉 Dynamic Availability: Stock illana "Out of Stock" nu varum
      availability: p.stock > 0 ? "Available" : "Out of Stock",
      ratingCount: Math.floor(Math.random() * 100) + 10,
    }));

    // Single Clean Response (No Duplicates)
    res.status(200).json({
      success: true,
      count: data.length,
      total_found_in_db: products.length, // Unnoda original metric preserved
      data,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// exports.getAllProducts = async (req, res) => {
//   try {
//     const { category, subCategory, search, page = 1, limit = 50 } = req.query;

//     let query = {};

//     if (category) query.category = category;
//     if (subCategory) query.subCategory = subCategory;
//     if (search) query.name = { $regex: search, $options: "i" };

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     const products = await Product.find(query)
//       .populate("category subCategory", "name image")
//       .populate({
//         path: "seller",
//         match: { status: "active" }, // Only active sellers
//         select: "shopName name address status",
//       })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(parseInt(limit))
//       .lean();

//     const filteredProducts = products.filter((p) => p.seller !== null);
//     const data = filteredProducts.map((p) => ({
//       ...formatProductMedia(p),
//       stock: p.stock !== undefined ? p.stock : 0,
//       price: p.price || 99,
//       mrp: p.mrp || 150,
//       availability: "Available",
//       ratingCount: Math.floor(Math.random() * 100) + 10,
//     }));

//     res.status(200).json({
//       success: true,
//       count: data.length,
//       data,
//     });

//     res.status(200).json({
//       success: true,
//       count: data.length,
//       total_found_in_db: products.length,
//       data,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.user?.id;

    // 1️⃣ Fetch product first
    let product = await Product.findOne({ _id: productId, seller: sellerId });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // 🌟 SAFETY FIX: Check both casing and fallback to existing product data
    // Image 51 crash-ah prevent panna indha optional chaining mukkiyam
    const incomingMasterId =
      req.body.masterProductId || req.body.masterProductid;
    const masterIdToUse = incomingMasterId || product?.masterProductId;

    if (!masterIdToUse) {
      return res.status(400).json({
        success: false,
        message: "Master Product mapping missing for this item",
      });
    }

    // 🌟 2️⃣ Master Data Fetch (Create Product logic mirror)
    const masterData =
      await MasterProduct.findById(masterIdToUse).populate("hsnMasterId");
    if (!masterData) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Master Product selection" });
    }

    // 3️⃣ Media Handling
    const images =
      req.files && req.files["images"]
        ? req.files["images"].map((f) => f.key)
        : product.images;
    const video =
      req.files && req.files["video"]
        ? req.files["video"][0].key
        : product.video;

    // 🌟 4️⃣ Construction (Mirroring Create Product logic 100%)
    const updateData = {
      ...req.body,
      masterProductId: masterIdToUse,
      name: req.body.name || masterData.name,
      isFreeDelivery:
        req.body.isFreeDelivery === "true" || req.body.isFreeDelivery === true,

      // Strictly from Master like your createProduct logic
      category: masterData.category,
      subCategory: masterData.subCategory,
      hsnCode: masterData.hsnMasterId?.hsnCode || product.hsnCode,
      gstPercentage: masterData.hsnMasterId?.gstRate || product.gstPercentage,

      // Numbers strictly enforced
      price: Number(req.body.price || product.price),
      mrp: Number(req.body.mrp || product.mrp),
      stock: Number(req.body.stock || product.stock),

      images,
      video,
      variants: req.body.variants
        ? typeof req.body.variants === "string"
          ? JSON.parse(req.body.variants)
          : req.body.variants
        : product.variants,
    };

    // 5️⃣ Discount Sync
    if (updateData.mrp > updateData.price) {
      updateData.discountPercentage = Math.round(
        ((updateData.mrp - updateData.price) / updateData.mrp) * 100,
      );
    } else {
      updateData.discountPercentage = 0;
    }

    // 🚀 PERFORM UPDATE
    const updated = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    res.json({
      success: true,
      message: "Product updated successfully! ✅",
      data: updated,
    });
  } catch (err) {
    console.error("Mirror Update Critical Error:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
};
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const objectsToDelete = [
      ...(product.images || []).map((img) => ({ Key: img })),
      product.video ? { Key: product.video } : null,
    ].filter((obj) => obj && obj.Key);
    if (objectsToDelete.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Delete: { Objects: objectsToDelete },
        }),
      );
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Product removed successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🌟 6. GET PRODUCT BY ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "category subCategory seller",
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, data: formatProductMedia(product) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🌟 7. GET MY PRODUCTS (Seller Dashboard)
exports.getMyProducts = async (req, res) => {
  try {
    if (!req.user?.id)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const products = await Product.find({
      seller: req.user.id,
      isArchived: { $ne: true },
    })
      .populate("category subCategory")
      .lean();
    res.json({
      success: true,
      count: products.length,
      data: products.map((p) => formatProductMedia(p)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🌟 8. GET SIMILAR PRODUCTS (Strictly Active Only)
exports.getSimilarProducts = async (req, res) => {
  try {
    const { category } = req.query;
    const products = await Product.find({
      category,
      _id: { $ne: req.params.id }, // Current product-ah exclude pannurom
      status: "active",            // 🌟 THE FIX: Strictly active products only
      isArchived: { $ne: true },
      isMaster: false,
    })
      .limit(6)
      .lean();

    res.json({
      success: true,
      data: products.map((p) => formatProductMedia(p)), // Formattingpreserved
    });
  } catch (err) {
    // Safety check for error key consistency
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🌟 9. GET MASTER LIST BY SUB-CATEGORY (Seller Dropdown)
exports.getMasterListBySubCategory = async (req, res) => {
  try {
    const list = await MasterProduct.find({
      subCategory: req.params.subCatId,
      isApproved: true,
    })
      .populate("hsnMasterId")
      .lean(); // Added populate here for frontend convenience
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
// 🌟 TOGGLE PRODUCT STATUS (Active/Inactive)
exports.toggleProductStatus = async (req, res) => {
  try {
    const productId = req.params.id;
    const sellerId = req.user?.id;

    // 1. Find product and ensure it belongs to the logged-in seller
    const product = await Product.findOne({ _id: productId, seller: sellerId });
    
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
    }

    // 2. Strict Toggle Logic
    // String comparison-la thappu varaama irukka trim and lowercase panrom
    const currentStatus = product.status ? product.status.toLowerCase().trim() : "active";
    
    if (currentStatus === "active") {
        product.status = "inactive";
    } else {
        product.status = "active";
    }

    // 3. Save with validation
    await product.save();

    console.log(`✅ Product ${productId} status changed to: ${product.status}`);

    res.json({
      success: true,
      message: `Product is now ${product.status.toUpperCase()}`,
      status: product.status // 👈 Ippo active/inactive katchithama thirumba varum
    });

  } catch (err) {
    console.error("❌ Toggle Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};