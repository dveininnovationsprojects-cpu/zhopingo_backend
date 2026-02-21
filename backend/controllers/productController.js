


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

// 🌟 2. GET ALL PRODUCTS (Modified to check Active Sellers)
exports.getAllProducts = async (req, res) => {
    try {
        const { category, subCategory, search, page = 1, limit = 20 } = req.query;

        // 🔥 STEP 1: முதலில் Active நிலையில் உள்ள செல்லர்களை மட்டும் எடுக்கிறோம்
        const activeSellers = await Seller.find({ status: 'active' }).select('_id');
        const activeSellerIds = activeSellers.map(s => s._id);

        // 🔥 STEP 2: குவரியில் செல்லர் ஐடியைச் சேர்க்கிறோம்
        let query = { 
            isArchived: { $ne: true },
            seller: { $in: activeSellerIds } // செல்லர் Active-ஆக இருக்க வேண்டும்
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

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        
        const data = products.map(p => ({
            ...p,
            images: (p.images || []).map(img => (img && img.startsWith('http')) ? img : baseUrl + img),
            video: p.video ? (p.video.startsWith('http') ? p.video : baseUrl + p.video) : "",
            availability: p.stock <= 0 ? "Out of Stock" : (p.stock < 10 ? `Only ${p.stock} left` : "Available"),
            ratingCount: Math.floor(Math.random() * (200 - 50) + 50)
        }));

        res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🌟 3. GET MY PRODUCTS
exports.getMyProducts = async (req, res) => {
    try {
        if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });

        const products = await Product.find({ seller: req.user.id, isArchived: { $ne: true } })
            .populate('category subCategory').lean();

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/products/`;

        const data = products.map(p => ({
            ...p,
            images: (p.images || []).map(img => (img && (img.startsWith('http') || img.includes('zhopingo.in'))) ? img : baseUrl + img),
            video: p.video ? (p.video.startsWith('http') ? p.video : baseUrl + p.video) : ""
        }));

        res.json({ success: true, count: data.length, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🌟 4. UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
    try {
        if (req.body.variants && typeof req.body.variants === 'string') {
            req.body.variants = JSON.parse(req.body.variants);
        }
        const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updated });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// 🌟 5. DELETE PRODUCT
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

// 🌟 6. GET PRODUCT BY ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category subCategory seller');
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        
        // ஒருவேளை செல்லர் Inactive-ஆக இருந்தால் காட்டக்கூடாது என்றால்:
        if (product.seller && product.seller.status === 'inactive') {
            return res.status(403).json({ success: false, message: "Product currently unavailable" });
        }

        res.status(200).json({ success: true, data: formatProductMedia(product, req) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 🌟 7. GET SIMILAR PRODUCTS (Modified to check Active Sellers)
exports.getSimilarProducts = async (req, res) => {
    try {
        const { category } = req.query;

        // 🔥 Active செல்லர்களை மட்டும் பில்டர் செய்கிறோம்
        const activeSellers = await Seller.find({ status: 'active' }).select('_id');
        const activeSellerIds = activeSellers.map(s => s._id);

        const products = await Product.find({ 
            category, 
            _id: { $ne: req.params.id }, 
            isArchived: { $ne: true },
            seller: { $in: activeSellerIds } // செல்லர் Active-ஆக இருக்க வேண்டும்
        }).limit(6).lean();

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        const data = products.map(p => ({ ...p, images: (p.images || []).map(img => img.startsWith('http') ? img : baseUrl + img) }));
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};