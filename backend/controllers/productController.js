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
            name: masterData.name, // Auto name from catalog
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

// 🌟 2. SELLER NAME REQUEST (Token Rise)
exports.requestNewProduct = async (req, res) => {
    try {
        const { name, category, subCategory } = req.body;
        
        const newRequest = new MasterProduct({
            name,
            category,
            subCategory,
            isApproved: false,
            status: 'pending'
        });

        await newRequest.save();
        res.status(201).json({ success: true, message: "Product Name request sent to Admin!", data: newRequest });
    } catch (err) { 
        res.status(400).json({ success: false, error: err.message }); 
    }
};

// 🌟 3. GET ALL PRODUCTS (Customer View)
exports.getAllProducts = async (req, res) => {
    try {
        const { category, subCategory, search, page = 1, limit = 20 } = req.query;

        const inactiveSellers = await Seller.find({ status: 'inactive' }).select('_id');
        const inactiveIds = inactiveSellers.map(s => s._id);

        let query = {
            isArchived: { $ne: true },
            isMaster: false,
            isApproved: true,
            seller: { $nin: inactiveIds }
        };

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

        const data = products.map(p => ({
            ...formatProductMedia(p),
            availability: p.stock <= 0 ? "Out of Stock" : (p.stock < 10 ? `Only ${p.stock} left` : "Available"),
            ratingCount: Math.floor(Math.random() * (200 - 50) + 50)
        }));

        res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🌟 4. UPDATE PRODUCT (Syncs HSN if Master ID changes)
exports.updateProduct = async (req, res) => {
    try {
        let updateData = { ...req.body };

        // 🔥 If master product changes, update HSN and GST too
        if (updateData.masterProductId) {
            const masterData = await MasterProduct.findById(updateData.masterProductId).populate('hsnMasterId');
            if (masterData) {
                updateData.name = masterData.name;
                updateData.hsnCode = masterData.hsnMasterId.hsnCode;
                updateData.gstPercentage = masterData.hsnMasterId.gstRate;
            }
        }

        if (updateData.variants && typeof updateData.variants === 'string') {
            updateData.variants = JSON.parse(updateData.variants);
        }
        if (req.files) {
            if (req.files['images']) updateData.images = req.files['images'].map(f => f.key);
            if (req.files['video']) updateData.video = req.files['video'][0].key;
        }
        if (updateData.mrp && updateData.price) {
            updateData.discountPercentage = updateData.mrp > updateData.price ? Math.round(((updateData.mrp - updateData.price) / updateData.mrp) * 100) : 0;
        }

        const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: "Product not found" });
        res.json({ success: true, data: updated });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// 🌟 5. DELETE PRODUCT (With S3 Cleanup)
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