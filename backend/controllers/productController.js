const Product = require('../models/Product');
const Seller = require('../models/Seller');
const SubCategory = require('../models/SubCategory');
const MasterProduct = require('../models/MasterProduct'); 
const { s3 } = require('../middleware/multerConfig');
const { DeleteObjectsCommand } = require("@aws-sdk/client-s3");

// 🌟 Helper: CloudFront URL logic
const formatProductMedia = (product) => {
    const CF_URL = process.env.CLOUDFRONT_URL;
    const doc = product.toObject ? product.toObject() : product;

    return {
        ...doc,
        images: (doc.images || []).map(img =>
            (img && img.startsWith('http')) ? img : CF_URL + img
        ),
        video: doc.video ?
            (doc.video.startsWith('http') ? doc.video : CF_URL + doc.video)
            : ""
    };
};

// 🌟 1. CREATE PRODUCT (Mapping with Master Catalog)
exports.createProduct = async (req, res) => {
    try {
        const sellerId = req.user?.id;
        const seller = await Seller.findById(sellerId);
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

        const { masterProductId, price, mrp, stock } = req.body;

        // 🔥 FIX: Fetching HSN/GST from MasterProduct via Populate
        const masterData = await MasterProduct.findById(masterProductId).populate('hsnMasterId');
        if (!masterData) return res.status(400).json({ success: false, message: "Invalid Master Product selection" });

        const images = req.files && req.files['images'] ? req.files['images'].map(f => f.key) : [];
        const video = req.files && req.files['video'] ? req.files['video'][0].key : "";

        const product = new Product({
            ...req.body,
            masterProductId: masterProductId,
            name: req.body.name, 
            isFreeDelivery: req.body.isFreeDelivery === 'true' || req.body.isFreeDelivery === true,
            category: masterData.category,
            subCategory: masterData.subCategory,
            hsnCode: masterData.hsnMasterId.hsnCode, // Copied from HSN Master
            gstPercentage: masterData.hsnMasterId.gstRate, // Copied from HSN Master
            discountPercentage: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
            images,
            video,
            seller: sellerId,
            isMaster: false,
            isApproved: true,
            variants: req.body.variants ? (typeof req.body.variants === 'string' ? JSON.parse(req.body.variants) : req.body.variants) : [],
            averageRating: (Math.random() * (5 - 3) + 3).toFixed(1)
        });

        await product.save();
        res.status(201).json({ success: true, message: "Product created successfully!", data: product });
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
            status: 'pending'
        });

        await newRequest.save();
        res.status(201).json({ success: true, message: "Product Name request sent to Admin!", data: newRequest });
    } catch (err) { 
        res.status(400).json({ success: false, error: err.message }); 
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        const { category, subCategory, search, page = 1, limit = 50 } = req.query;


        let query = {}; 

        if (category) query.category = category;
        if (subCategory) query.subCategory = subCategory;
        if (search) query.name = { $regex: search, $options: "i" };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const products = await Product.find(query)
            .populate("category subCategory", "name image")
            .populate("seller", "shopName name address status")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // media formatting and fallback values for UI
        const data = products.map(p => ({
            ...formatProductMedia(p),
            stock: p.stock !== undefined ? p.stock : 0, 
            price: p.price || 99, 
            mrp: p.mrp || 150,
            availability: "Available",
            ratingCount: Math.floor(Math.random() * 100) + 10
        }));

        res.status(200).json({ 
            success: true, 
            count: data.length, 
            total_found_in_db: products.length,
            data 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const sellerId = req.user?.id;

        // 1️⃣ Product andha seller-oda thaan-nu first verify panroam
        let product = await Product.findOne({ _id: productId, seller: sellerId });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found or unauthorized access" });
        }

        // 🌟 Initial Update Data formation
        let updateData = { ...req.body };

        // 2️⃣ Master Product Logic Fix:
        // Oru vaelai nee name-ah manual-ah update panna ninaicha, adhu masterProductId overwrite panna koodadhu
        if (updateData.masterProductId && updateData.masterProductId !== product.masterProductId?.toString()) {
            const masterData = await MasterProduct.findById(updateData.masterProductId).populate('hsnMasterId');
            if (masterData) {
                updateData.name = masterData.name;
                updateData.category = masterData.category;
                updateData.subCategory = masterData.subCategory;
                updateData.hsnCode = masterData.hsnMasterId?.hsnCode;
                updateData.gstPercentage = masterData.hsnMasterId?.gstRate;
            }
        } else {
            // Master Product maathala na, nee body-la anuppura 'name'-ah allow pannanum
            if (req.body.name) updateData.name = req.body.name;
        }

        // 3️⃣ Strictly converting types (String to Number)
        if (updateData.price) updateData.price = Number(updateData.price);
        if (updateData.mrp) updateData.mrp = Number(updateData.mrp);
        if (updateData.stock) updateData.stock = Number(updateData.stock);

        // 4️⃣ Variant Parsing logic
        if (updateData.variants && typeof updateData.variants === 'string') {
            try { updateData.variants = JSON.parse(updateData.variants); } catch (e) {}
        }

        // 5️⃣ Files (Images/Video) Update
        if (req.files) {
            if (req.files['images']) updateData.images = req.files['images'].map(f => f.key);
            if (req.files['video']) updateData.video = req.files['video'][0].key;
        }

        // 6️⃣ Discount Auto-recalc
        const finalMRP = updateData.mrp !== undefined ? updateData.mrp : product.mrp;
        const finalPrice = updateData.price !== undefined ? updateData.price : product.price;
        if (finalMRP > 0) {
            updateData.discountPercentage = finalMRP > finalPrice 
                ? Math.round(((finalMRP - finalPrice) / finalMRP) * 100) 
                : 0;
        }

        // 🚀 THE CRITICAL FIX: Direct Update using $set
        const updated = await Product.findByIdAndUpdate(
            productId, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        );

        res.json({ 
            success: true, 
            message: "Product updated successfully!", 
            data: updated 
        });

    } catch (err) { 
        res.status(400).json({ success: false, error: err.message }); 
    }
};
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        const objectsToDelete = [...(product.images || []).map(img => ({ Key: img })), product.video ? { Key: product.video } : null].filter(obj => obj && obj.Key);
        if (objectsToDelete.length > 0) {
            await s3.send(new DeleteObjectsCommand({ Bucket: process.env.AWS_BUCKET_NAME, Delete: { Objects: objectsToDelete } }));
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Product removed successfully!" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 🌟 6. GET PRODUCT BY ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category subCategory seller');
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        res.status(200).json({ success: true, data: formatProductMedia(product) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 🌟 7. GET MY PRODUCTS (Seller Dashboard)
exports.getMyProducts = async (req, res) => {
    try {
        if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
        const products = await Product.find({ seller: req.user.id, isArchived: { $ne: true } }).populate('category subCategory').lean();
        res.json({ success: true, count: products.length, data: products.map(p => formatProductMedia(p)) });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 🌟 8. GET SIMILAR PRODUCTS
exports.getSimilarProducts = async (req, res) => {
    try {
        const { category } = req.query;
        const products = await Product.find({ category, _id: { $ne: req.params.id }, isArchived: { $ne: true }, isMaster: false }).limit(6).lean();
        res.json({ success: true, data: products.map(p => formatProductMedia(p)) });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 🌟 9. GET MASTER LIST BY SUB-CATEGORY (Seller Dropdown)
exports.getMasterListBySubCategory = async (req, res) => {
    try {
        const list = await MasterProduct.find({ 
            subCategory: req.params.subCatId,
            isApproved: true 
        }).populate('hsnMasterId').lean(); // Added populate here for frontend convenience
        res.json({ success: true, data: list });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};