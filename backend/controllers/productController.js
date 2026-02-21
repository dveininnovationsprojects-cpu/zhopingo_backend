


// const Product = require('../models/Product');
// const Seller = require('../models/Seller');
// const SubCategory = require('../models/SubCategory');
// const fs = require('fs');
// const path = require('path');

// // 🌟 EXACT Helper (உன் பழைய லாஜிக் - ஒரு துளி கூட மாற்றப்படவில்லை)
// const formatProductMedia = (product, req) => {
//     const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
//     const doc = product.toObject ? product.toObject() : product;

//     return {
//         ...doc,
//         images: (doc.images || []).map(img => 
//             (img && img.startsWith('http')) ? img : baseUrl + img
//         ),
//         video: doc.video ? 
//             (doc.video.startsWith('http') ? doc.video : baseUrl + doc.video) 
//             : ""
//     };
// };


// exports.createProduct = async (req, res) => {
//     try {
//         const sellerId = req.body.seller|| req.user?.id ;
//         const seller = await Seller.findById(sellerId);
//         if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

//         const subCat = await SubCategory.findById(req.body.subCategory);
//         if (!subCat) return res.status(400).json({ success: false, message: "Invalid SubCategory" });

      
//         const images = req.files && req.files['images'] ? req.files['images'].map(f => f.filename) : [];
//         const video = req.files && req.files['video'] ? req.files['video'][0].filename : "";

//         // 🌟 Discount Calculation
//         const discount = req.body.mrp > req.body.price 
//             ? Math.round(((req.body.mrp - req.body.price) / req.body.mrp) * 100) 
//             : 0;

//         const product = new Product({
//             ...req.body,
//             hsnCode: subCat.hsnCode, 
//             gstPercentage: subCat.gstRate || subCat.gstPercentage || 0,
//             discountPercentage: discount,
//             images,
//             video,
//             seller: seller._id,
//             // 🌟 Variants Logic: JSON-ஆக வந்தால் Parse செய்யும்
//             variants: req.body.variants ? (typeof req.body.variants === 'string' ? JSON.parse(req.body.variants) : req.body.variants) : [],
//             // 🌟 Initial Random Ratings (Social Proof)
//             averageRating: (Math.random() * (5 - 3) + 3).toFixed(1) 
//         });

//         await product.save();
//         res.status(201).json({ success: true, data: product });

//     } catch (err) { 
//         console.error("Create Product Error:", err);
//         res.status(400).json({ success: false, error: err.message }); 
//     }
// };

// // 🌟 2. GET ALL PRODUCTS (Customer View)
// exports.getAllProducts = async (req, res) => {
//     try {
//         const { category, subCategory, search, page = 1, limit = 20 } = req.query;
//         let query = { isArchived: { $ne: true } };

//         if (category) query.category = category;
//         if (subCategory) query.subCategory = subCategory;
//         if (search) query.name = { $regex: search, $options: "i" };

//         const skip = (parseInt(page) - 1) * parseInt(limit);

//         const products = await Product.find(query)
//             .populate("category subCategory", "name image")
//             .populate("seller", "shopName name address")
//             .sort({ createdAt: -1 })
//             .skip(skip)
//             .limit(parseInt(limit))
//             .lean(); 

//         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        
//         const data = products.map(p => ({
//             ...p,
//             images: (p.images || []).map(img => (img && img.startsWith('http')) ? img : baseUrl + img),
//             video: p.video ? (p.video.startsWith('http') ? p.video : baseUrl + p.video) : "",
//             // 🌟 Stock Alert Logic
//             availability: p.stock <= 0 ? "Out of Stock" : (p.stock < 10 ? `Only ${p.stock} left` : "Available"),
//             // 🌟 Rating Count logic
//             ratingCount: Math.floor(Math.random() * (200 - 50) + 50)
//         }));

//         res.status(200).json({ success: true, count: data.length, data });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

// // 🌟 3. GET MY PRODUCTS (Seller Dashboard - Unbroken URL Logic)
// exports.getMyProducts = async (req, res) => {
//     try {
//         if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });

//         const products = await Product.find({ seller: req.user.id, isArchived: { $ne: true } })
//             .populate('category subCategory').lean();

//         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/products/`;

//         const data = products.map(p => ({
//             ...p,
//             images: (p.images || []).map(img => (img && (img.startsWith('http') || img.includes('zhopingo.in'))) ? img : baseUrl + img),
//             video: p.video ? (p.video.startsWith('http') ? p.video : baseUrl + p.video) : ""
//         }));

//         res.json({ success: true, count: data.length, data });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

// // 🌟 4. UPDATE PRODUCT (Seller can update Offers & Variants)
// exports.updateProduct = async (req, res) => {
//     try {
//         if (req.body.variants && typeof req.body.variants === 'string') {
//             req.body.variants = JSON.parse(req.body.variants);
//         }
//         const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         res.json({ success: true, data: updated });
//     } catch (err) { res.status(400).json({ success: false, error: err.message }); }
// };

// // 🌟 5. DELETE PRODUCT (File System Cleanup)
// exports.deleteProduct = async (req, res) => {
//     try {
//         const product = await Product.findById(req.params.id);
//         if (!product) return res.status(404).json({ success: false, message: "Product not found" });

//         const uploadPath = path.join(__dirname, '../public/uploads/');
//         [...(product.images || []), product.video].forEach(file => {
//             if (file) {
//                 const filePath = path.join(uploadPath, file);
//                 if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
//             }
//         });

//         await Product.findByIdAndDelete(req.params.id);
//         res.json({ success: true, message: "Product deleted successfully!" });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// // 🌟 6. GET PRODUCT BY ID
// exports.getProductById = async (req, res) => {
//     try {
//         const product = await Product.findById(req.params.id).populate('category subCategory seller');
//         if (!product) return res.status(404).json({ success: false, message: "Product not found" });
//         res.status(200).json({ success: true, data: formatProductMedia(product, req) });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// // 🌟 7. GET SIMILAR PRODUCTS
// exports.getSimilarProducts = async (req, res) => {
//     try {
//         const { category } = req.query;
//         const products = await Product.find({ category, _id: { $ne: req.params.id }, isArchived: { $ne: true } }).limit(6).lean();
//         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
//         const data = products.map(p => ({ ...p, images: (p.images || []).map(img => img.startsWith('http') ? img : baseUrl + img) }));
//         res.json({ success: true, data });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

const Product = require('../models/Product');
const Seller = require('../models/Seller');
const SubCategory = require('../models/SubCategory');
const fs = require('fs');
const path = require('path');

// 🌟 Helper: இமேஜ் மற்றும் வீடியோ லிங்க்குகளை URL-ஆக மாற்ற
const formatProductMedia = (product, req) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const doc = product.toObject ? product.toObject() : product;

    return {
        ...doc,
        images: (doc.images || []).map(img => 
            (img && img.startsWith('http')) ? img : baseUrl + img
        ),
        video: doc.video ? 
            (doc.video.startsWith('http') ? doc.video : baseUrl + doc.video) 
            : ""
    };
};

// 🌟 1. CREATE PRODUCT
exports.createProduct = async (req, res) => {
    try {
        const sellerId = req.body.seller || req.user?.id;
        const seller = await Seller.findById(sellerId);
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

        const subCat = await SubCategory.findById(req.body.subCategory);
        if (!subCat) return res.status(400).json({ success: false, message: "Invalid SubCategory" });

        const images = req.files && req.files['images'] ? req.files['images'].map(f => f.filename) : [];
        const video = req.files && req.files['video'] ? req.files['video'][0].filename : "";

        const discount = req.body.mrp > req.body.price 
            ? Math.round(((req.body.mrp - req.body.price) / req.body.mrp) * 100) 
            : 0;

        const product = new Product({
            ...req.body,
            hsnCode: subCat.hsnCode, 
            gstPercentage: subCat.gstRate || subCat.gstPercentage || 0,
            discountPercentage: discount,
            images,
            video,
            seller: seller._id,
            variants: req.body.variants ? (typeof req.body.variants === 'string' ? JSON.parse(req.body.variants) : req.body.variants) : [],
            averageRating: (Math.random() * (5 - 3) + 3).toFixed(1) 
        });

        await product.save();
        res.status(201).json({ success: true, data: product });

    } catch (err) { 
        res.status(400).json({ success: false, error: err.message }); 
    }
};
// 🌟 2. GET ALL PRODUCTS (Customer View)
exports.getAllProducts = async (req, res) => {
    try {
        const { category, subCategory, search, page = 1, limit = 20 } = req.query;

        // Inactive செல்லர்களை தவிர்க்கும் லாஜிக்
        const inactiveSellers = await Seller.find({ status: 'inactive' }).select('_id');
        const inactiveIds = inactiveSellers.map(s => s._id);

        let query = { 
            isArchived: { $ne: true },
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

        // ✅ திருத்தம்: இங்கு 'products/' என்பதை சேர்த்துள்ளேன்
        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/products/`;
        
        const data = products.map(p => ({
            ...p,
            images: (p.images || []).map(img => {
                if (!img) return "";
                if (img.startsWith('https')) return img;
                // ஒருவேளை டேட்டாபேஸில் ஏற்கனவே 'products/' என்று இருந்தால் அதைத் தவிர்க்க
                const cleanImg = img.replace('products/', '');
                return baseUrl + cleanImg;
            }),
            video: p.video ? (p.video.startsWith('https') ? p.video : baseUrl + p.video) : "",
            availability: p.stock <= 0 ? "Out of Stock" : (p.stock < 10 ? `Only ${p.stock} left` : "Available"),
            ratingCount: Math.floor(Math.random() * (200 - 50) + 50)
        }));

        res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
// 🌟 4. UPDATE PRODUCT (Now Supports Image & Video Update)
exports.updateProduct = async (req, res) => {
    try {
        let updateData = { ...req.body };

        // Variants parse செய்தல்
        if (updateData.variants && typeof updateData.variants === 'string') {
            updateData.variants = JSON.parse(updateData.variants);
        }

        // புதிய இமேஜ்கள் வந்தால் பழையவற்றை மாற்றாமல் சேர்க்கலாம் அல்லது ரீப்ளேஸ் செய்யலாம்
        if (req.files) {
            if (req.files['images']) {
                updateData.images = req.files['images'].map(f => f.filename);
            }
            if (req.files['video']) {
                updateData.video = req.files['video'][0].filename;
            }
        }

        // Discount மறுபடியும் கணக்கிடுதல்
        if (updateData.mrp && updateData.price) {
            updateData.discountPercentage = updateData.mrp > updateData.price 
                ? Math.round(((updateData.mrp - updateData.price) / updateData.mrp) * 100) 
                : 0;
        }

        const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        
        if (!updated) return res.status(404).json({ success: false, message: "Product not found" });

        res.json({ success: true, data: updated });
    } catch (err) { 
        res.status(400).json({ success: false, error: err.message }); 
    }
};

// 🌟 7. GET SIMILAR PRODUCTS (Hide Inactive Sellers)
exports.getSimilarProducts = async (req, res) => {
    try {
        const { category } = req.query;

        const inactiveSellers = await Seller.find({ status: 'inactive' }).select('_id');
        const inactiveIds = inactiveSellers.map(s => s._id);

        const products = await Product.find({ 
            category, 
            _id: { $ne: req.params.id }, 
            isArchived: { $ne: true },
            seller: { $nin: inactiveIds } 
        }).limit(6).lean();

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        const data = products.map(p => ({ ...p, images: (p.images || []).map(img => img.startsWith('http') ? img : baseUrl + img) }));
        res.json({ success: true, data });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

// மற்ற பழைய பங்க்ஷன்கள் (getMyProducts, deleteProduct, getProductById) அப்படியே இருக்கட்டும்.
exports.getMyProducts = async (req, res) => {
    try {
        if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
        const products = await Product.find({ seller: req.user.id, isArchived: { $ne: true } }).populate('category subCategory').lean();
        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/products/`;
        const data = products.map(p => ({
            ...p,
            images: (p.images || []).map(img => (img && (img.startsWith('https') || img.includes('zhopingo.in'))) ? img : baseUrl + img),
            video: p.video ? (p.video.startsWith('https') ? p.video : baseUrl + p.video) : ""
        }));
        res.json({ success: true, count: data.length, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        const uploadPath = path.join(__dirname, '../public/uploads/');
        [...(product.images || []), product.video].forEach(file => {
            if (file) {
                const filePath = path.join(uploadPath, file);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        });
        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Product deleted successfully!" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category subCategory seller');
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        if (product.seller && product.seller.status === 'inactive') {
            return res.status(403).json({ success: false, message: "Product currently unavailable" });
        }
        res.status(200).json({ success: true, data: formatProductMedia(product, req) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};