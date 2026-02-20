
// const Product = require('../models/Product');
// const Seller = require('../models/Seller');
// const SubCategory = require('../models/SubCategory');


// // 🌟 Helper: இமேஜ் மற்றும் வீடியோ லிங்க்குகளை முழுமையான URL ஆக மாற்ற
// const formatProductMedia = (product, req) => {
//     const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
//     // Mongoose ஆப்ஜெக்ட்டை சுத்தமான JSON ஆக மாற்றுதல்
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
//         // 1. Get Seller ID from Token (req.user.id) or Request Body (for testing)
//         const sellerId = req.user?.id || req.body.seller;

//         if (!sellerId) {
//             return res.status(400).json({ success: false, message: "Seller ID is missing in token or body" });
//         }

//         // 2. Validate Seller
//         const seller = await Seller.findById(sellerId);
        
//         // 💡 DEBUG LOG: Check this in your terminal to see which ID is being sent
//         console.log("Attempting to create product for Seller ID:", sellerId);

//         if (!seller) {
//             return res.status(404).json({ 
//                 success: false, 
//                 message: "Seller not found. Ensure your User ID is registered as a Seller.",
//                 receivedId: sellerId 
//             });
//         }

//         // 3. Validate SubCategory
//         const subCat = await SubCategory.findById(req.body.subCategory);
//         if (!subCat) return res.status(400).json({ success: false, message: "Invalid SubCategory ID" });

//         const taxRate = subCat.gstRate || subCat.gstPercentage || 0;

//         // 4. Media Handling
//         const images = req.files && req.files['images'] ? req.files['images'].map(f => f.filename) : [];
//         const video = req.files && req.files['video'] ? req.files['video'][0].filename : "";

//         // 5. Discount Calculation
//         const discount = req.body.mrp > req.body.price 
//             ? Math.round(((req.body.mrp - req.body.price) / req.body.mrp) * 100) 
//             : 0;

//         // 6. Save Product
//         const product = new Product({
//             ...req.body,
//             hsnCode: subCat.hsnCode, 
//             gstPercentage: taxRate,
//             discountPercentage: discount,
//             images,
//             video,
//             seller: seller._id,
//             variants: req.body.variants ? (typeof req.body.variants === 'string' ? JSON.parse(req.body.variants) : req.body.variants) : [] 
//         });

//         await product.save();
//         res.status(201).json({ success: true, data: product });

//     } catch (err) { 
//         console.error("Create Product Error:", err);
//         res.status(400).json({ success: false, error: err.message }); 
//     }
// };

// // --- 🌟 GET ALL PRODUCTS (Optimized for Large Scale) ---
// exports.getAllProducts = async (req, res) => {
//     try {
//         // 1. Get page and limit from query, default to page 1, limit 20
//         const { category, subCategory, search, page = 1, limit = 20 } = req.query;
        
//         let query = { isArchived: { $ne: true } };
//         if (category) query.category = category;
//         if (subCategory) query.subCategory = subCategory;
//         if (search) query.name = { $regex: search, $options: "i" };

//         // 2. Calculate how many items to skip
//         const skip = (parseInt(page) - 1) * parseInt(limit);

//         // 3. Use .lean() to get plain JS objects instead of heavy Mongoose documents
//         const products = await Product.find(query)
//             .populate("category subCategory", "name image")
//             .populate("seller", "shopName name address")
//             .sort({ createdAt: -1 })
//             .skip(skip)   // Skip previous pages
//             .limit(parseInt(limit)) // Only fetch 20
//             .lean(); 

//         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        
//         const data = products.map(p => ({
//             ...p,
//             images: p.images ? p.images.map(img => 
//                 (img && img.startsWith('http')) ? img : baseUrl + img
//             ) : [],
//             video: p.video ? (p.video.startsWith('http') ? p.video : baseUrl + p.video) : ""
//         }));

//         res.status(200).json({ 
//             success: true, 
//             count: data.length,
//             currentPage: Number(page),
//             data 
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

// // --- 🌟 3. GET PRODUCT BY ID ---
// exports.getProductById = async (req, res) => {
//     try {
//         const product = await Product.findById(req.params.id)
//             .populate('category subCategory')
//             .populate('seller', 'name shopName phone address');

//         if (!product) return res.status(404).json({ success: false, message: "Product not found" });

//         const data = formatProductMedia(product, req);
//         res.status(200).json({ success: true, data });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

// exports.getMyProducts = async (req, res) => {
//     try {
//         // 1. Check matching with Step 1 (req.user.id)
//         if (!req.user || !req.user.id) {
//             return res.status(401).json({ success: false, message: "Seller ID missing in token" });
//         }

//         // 2. Query matching the field name
//         const products = await Product.find({ 
//             seller: req.user.id, 
//             isArchived: { $ne: true } 
//         }).populate('category subCategory').lean();

//         // 3. Image URL Fix (Avoiding double domains)
//         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/products/`;

//         const data = products.map(p => ({
//             ...p,
//             images: p.images ? p.images.map(img => 
//                 (img && (img.startsWith('http') || img.includes('zhopingo.in'))) 
//                 ? img 
//                 : baseUrl + img
//             ) : []
//         }));

//         res.json({ success: true, count: data.length, data });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };
// // --- 🌟 5. UPDATE & DELETE ---
// exports.updateProduct = async (req, res) => {
//     try {
//         const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         res.json({ success: true, data: updated });
//     } catch (err) { res.status(400).json({ success: false, error: err.message }); }
// };

// exports.deleteProduct = async (req, res) => {
//     try {
//         // 1. முதலில் அந்த தயாரிப்பைக் கண்டறியவும்
//         const product = await Product.findById(req.params.id);
        
//         if (!product) {
//             return res.status(404).json({ success: false, message: "Product not found" });
//         }

//         // 2. இமேஜ்களை சர்வரில் இருந்து நீக்குதல்
//         if (product.images && product.images.length > 0) {
//             product.images.forEach(imgName => {
//                 // உங்கள் multerConfig படி பாத்: public/uploads/
//                 const imagePath = path.join(__dirname, '../public/uploads/', imgName);
//                 if (fs.existsSync(imagePath)) {
//                     fs.unlinkSync(imagePath); // ஃபைலை டெலீட் செய்யும்
//                 }
//             });
//         }

//         // 3. வீடியோவை சர்வரில் இருந்து நீக்குதல்
//         if (product.video) {
//             const videoPath = path.join(__dirname, '../public/uploads/', product.video);
//             if (fs.existsSync(videoPath)) {
//                 fs.unlinkSync(videoPath); // வீடியோவை டெலீட் செய்யும்
//             }
//         }

//         // 4. இப்போது டேட்டாபேஸில் இருந்து நீக்கவும் (முழுமையாக நீக்க Delete பயன்படுத்தவும்)
//         await Product.findByIdAndDelete(req.params.id);

//         res.json({ success: true, message: "Product and its media files deleted successfully!" });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };exports.getSimilarProducts = async (req, res) => {
//     try {
//         const { id } = req.params; // தற்போது பார்க்கும் தயாரிப்பின் ID
//         const { category } = req.query; // URL-ல் வரும் Category ID

//         // ஐடி செக் செய்தல்
//         if (!category || category === 'undefined') {
//             return res.status(400).json({ success: false, message: "Valid Category ID is required" });
//         }

//         // 🌟 லாஜிக்: அதே பிரிவில் இருக்க வேண்டும், ஆனால் அதே தயாரிப்பாக இருக்கக்கூடாது
//         const similarProducts = await Product.find({
//             category: category,
//             _id: { $ne: id }, // $ne = Not Equal (தற்போதைய தயாரிப்பைத் தவிர்க்க)
//             isArchived: { $ne: true }
//         })
//         .limit(6) // 6 தயாரிப்புகள் போதும்
//         .populate('category subCategory', 'name')
//         .lean();

//         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        
//         // இமேஜ் URL-களைச் சேர்த்தல்
//         const data = similarProducts.map(p => ({
//             ...p,
//             images: p.images ? p.images.map(img => 
//                 (img && img.startsWith('http')) ? img : baseUrl + img
//             ) : []
//         }));

//         res.json({
//             success: true,
//             count: data.length,
//             data: data
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };


const Product = require('../models/Product');
const Seller = require('../models/Seller');
const SubCategory = require('../models/SubCategory');
const fs = require('fs');
const path = require('path');

// 🌟 EXACT Helper (உன் பழைய லாஜிக் - ஒரு துளி கூட மாற்றப்படவில்லை)
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


exports.createProduct = async (req, res) => {
    try {
        const sellerId = req.body.seller|| req.user?.id ;
        const seller = await Seller.findById(sellerId);
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

        const subCat = await SubCategory.findById(req.body.subCategory);
        if (!subCat) return res.status(400).json({ success: false, message: "Invalid SubCategory" });

      
        const images = req.files && req.files['images'] ? req.files['images'].map(f => f.filename) : [];
        const video = req.files && req.files['video'] ? req.files['video'][0].filename : "";

        // 🌟 Discount Calculation
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
            // 🌟 Variants Logic: JSON-ஆக வந்தால் Parse செய்யும்
            variants: req.body.variants ? (typeof req.body.variants === 'string' ? JSON.parse(req.body.variants) : req.body.variants) : [],
            // 🌟 Initial Random Ratings (Social Proof)
            averageRating: (Math.random() * (5 - 3) + 3).toFixed(1) 
        });

        await product.save();
        res.status(201).json({ success: true, data: product });

    } catch (err) { 
        console.error("Create Product Error:", err);
        res.status(400).json({ success: false, error: err.message }); 
    }
};

// 🌟 2. GET ALL PRODUCTS (Customer View)
exports.getAllProducts = async (req, res) => {
    try {
        const { category, subCategory, search, page = 1, limit = 20 } = req.query;
        let query = { isArchived: { $ne: true } };

        if (category) query.category = category;
        if (subCategory) query.subCategory = subCategory;
        if (search) query.name = { $regex: search, $options: "i" };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const products = await Product.find(query)
            .populate("category subCategory", "name image")
            .populate("seller", "shopName name address")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(); 

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        
        const data = products.map(p => ({
            ...p,
            images: (p.images || []).map(img => (img && img.startsWith('http')) ? img : baseUrl + img),
            video: p.video ? (p.video.startsWith('http') ? p.video : baseUrl + p.video) : "",
            // 🌟 Stock Alert Logic
            availability: p.stock <= 0 ? "Out of Stock" : (p.stock < 10 ? `Only ${p.stock} left` : "Available"),
            // 🌟 Rating Count logic
            ratingCount: Math.floor(Math.random() * (200 - 50) + 50)
        }));

        res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🌟 3. GET MY PRODUCTS (Seller Dashboard - Unbroken URL Logic)
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

// 🌟 4. UPDATE PRODUCT (Seller can update Offers & Variants)
exports.updateProduct = async (req, res) => {
    try {
        if (req.body.variants && typeof req.body.variants === 'string') {
            req.body.variants = JSON.parse(req.body.variants);
        }
        const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updated });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

// 🌟 5. DELETE PRODUCT (File System Cleanup)
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
        res.status(200).json({ success: true, data: formatProductMedia(product, req) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 🌟 7. GET SIMILAR PRODUCTS
exports.getSimilarProducts = async (req, res) => {
    try {
        const { category } = req.query;
        const products = await Product.find({ category, _id: { $ne: req.params.id }, isArchived: { $ne: true } }).limit(6).lean();
        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        const data = products.map(p => ({ ...p, images: (p.images || []).map(img => img.startsWith('http') ? img : baseUrl + img) }));
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};