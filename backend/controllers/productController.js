

// const Product = require('../models/Product');
// const Seller = require('../models/Seller');
// const SubCategory = require('../models/SubCategory');
// const fs = require('fs');
// const path = require('path');

// // 🌟 Helper: இமேஜ் மற்றும் வீடியோ லிங்க்குகளை URL-ஆக மாற்ற
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

// // 🌟 1. CREATE PRODUCT
// exports.createProduct = async (req, res) => {
//     try {
//         const sellerId = req.body.seller || req.user?.id;
//         const seller = await Seller.findById(sellerId);
//         if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

//         const subCat = await SubCategory.findById(req.body.subCategory);
//         if (!subCat) return res.status(400).json({ success: false, message: "Invalid SubCategory" });

//         const images = req.files && req.files['images'] ? req.files['images'].map(f => f.filename) : [];
//         const video = req.files && req.files['video'] ? req.files['video'][0].filename : "";

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
//             variants: req.body.variants ? (typeof req.body.variants === 'string' ? JSON.parse(req.body.variants) : req.body.variants) : [],
//             averageRating: (Math.random() * (5 - 3) + 3).toFixed(1) 
//         });

//         await product.save();
//         res.status(201).json({ success: true, data: product });

//     } catch (err) { 
//         res.status(400).json({ success: false, error: err.message }); 
//     }
// };
// // 🌟 2. GET ALL PRODUCTS (Customer View - Corrected Logic)
// exports.getAllProducts = async (req, res) => {
//     try {
//         const { category, subCategory, search, page = 1, limit = 20 } = req.query;

//         // 🔥 STEP 1: Inactive செல்லர்களை மட்டும் பில்டர் செய்கிறோம்
//         const inactiveSellers = await Seller.find({ status: 'inactive' }).select('_id');
//         const inactiveIds = inactiveSellers.map(s => s._id);

//         // 🔥 STEP 2: Query Setup
//         // 'seller' என்ற ஃபீல்டு உன்னுடைய Product Schema-வில் உள்ளது.
//         // நாம் $nin (Not In) பயன்படுத்துவதால் 'inactive' தவிர மற்ற எல்லோரும் தெரிவார்கள்.
//         let query = { 
//             isArchived: { $ne: true },
//             seller: { $nin: inactiveIds } 
//         };

//         if (category) query.category = category;
//         if (subCategory) query.subCategory = subCategory;
//         if (search) query.name = { $regex: search, $options: "i" };

//         const skip = (parseInt(page) - 1) * parseInt(limit);

//         const products = await Product.find(query)
//             .populate("category subCategory", "name image")
//             .populate("seller", "shopName name address status") // 'status' சேர்த்து populate செய்கிறோம்
//             .sort({ createdAt: -1 })
//             .skip(skip)
//             .limit(parseInt(limit))
//             .lean(); 

//         // இமேஜ் பாத் பிழை (Path Correction)
//         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/products/`;
        
//         const data = products.map(p => ({
//             ...p,
//             images: (p.images || []).map(img => (img && img.startsWith('http')) ? img : baseUrl + img),
//             video: p.video ? (p.video.startsWith('http') ? p.video : baseUrl + p.video) : "",
//             availability: p.stock <= 0 ? "Out of Stock" : (p.stock < 10 ? `Only ${p.stock} left` : "Available"),
//             ratingCount: Math.floor(Math.random() * (200 - 50) + 50)
//         }));

//         res.status(200).json({ success: true, count: data.length, data });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

// exports.updateProduct = async (req, res) => {
//     try {
//         let updateData = { ...req.body };

       
//         if (updateData.variants && typeof updateData.variants === 'string') {
//             updateData.variants = JSON.parse(updateData.variants);
//         }

        
//         if (req.files) {
//             if (req.files['images']) {
//                 updateData.images = req.files['images'].map(f => f.filename);
//             }
//             if (req.files['video']) {
//                 updateData.video = req.files['video'][0].filename;
//             }
//         }

        
//         if (updateData.mrp && updateData.price) {
//             updateData.discountPercentage = updateData.mrp > updateData.price 
//                 ? Math.round(((updateData.mrp - updateData.price) / updateData.mrp) * 100) 
//                 : 0;
//         }

//         const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        
//         if (!updated) return res.status(404).json({ success: false, message: "Product not found" });

//         res.json({ success: true, data: updated });
//     } catch (err) { 
//         res.status(400).json({ success: false, error: err.message }); 
//     }
// };


// exports.getSimilarProducts = async (req, res) => {
//     try {
//         const { category } = req.query;

//         const inactiveSellers = await Seller.find({ status: 'inactive' }).select('_id');
//         const inactiveIds = inactiveSellers.map(s => s._id);

//         const products = await Product.find({ 
//             category, 
//             _id: { $ne: req.params.id }, 
//             isArchived: { $ne: true },
//             seller: { $nin: inactiveIds } 
//         }).limit(6).lean();

//         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
//         const data = products.map(p => ({ ...p, images: (p.images || []).map(img => img.startsWith('http') ? img : baseUrl + img) }));
//         res.json({ success: true, data });
//     } catch (err) { 
//         res.status(500).json({ success: false, error: err.message }); 
//     }
// };


// exports.getMyProducts = async (req, res) => {
//     try {
//         if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
//         const products = await Product.find({ seller: req.user.id, isArchived: { $ne: true } }).populate('category subCategory').lean();
//         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/products/`;
//         const data = products.map(p => ({
//             ...p,
//             images: (p.images || []).map(img => (img && (img.startsWith('https') || img.includes('zhopingo.in'))) ? img : baseUrl + img),
//             video: p.video ? (p.video.startsWith('https') ? p.video : baseUrl + p.video) : ""
//         }));
//         res.json({ success: true, count: data.length, data });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

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

// exports.getProductById = async (req, res) => {
//     try {
//         const product = await Product.findById(req.params.id).populate('category subCategory seller');
//         if (!product) return res.status(404).json({ success: false, message: "Product not found" });
//         if (product.seller && product.seller.status === 'inactive') {
//             return res.status(403).json({ success: false, message: "Product currently unavailable" });
//         }
//         res.status(200).json({ success: true, data: formatProductMedia(product, req) });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };


const Product = require('../models/Product');
const Seller = require('../models/Seller');
const SubCategory = require('../models/SubCategory');
const { s3 } = require('../middleware/multerConfig'); // 🌟 S3 instance-ai import pannuvom

// 🌟 Helper: CloudFront URL-ai lightning fast-ah attach panna
const formatProductMedia = (product) => {
    const CF_URL = process.env.CLOUDFRONT_URL; // Example: https://d1utzn73483swp.cloudfront.net/
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

// 🌟 1. CREATE PRODUCT
exports.createProduct = async (req, res) => {
    try {
        const sellerId = req.body.seller || req.user?.id;
        const seller = await Seller.findById(sellerId);
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

        const subCat = await SubCategory.findById(req.body.subCategory);
        if (!subCat) return res.status(400).json({ success: false, message: "Invalid SubCategory" });

        // 🌟 S3-la irunthu kidaikkura 'key'-ai (e.g., products/123.jpg) save pannuvom
        const images = req.files && req.files['images'] ? req.files['images'].map(f => f.key) : [];
        const video = req.files && req.files['video'] ? req.files['video'][0].key : "";

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

        const data = products.map(p => ({
            ...formatProductMedia(p), // 🌟 CloudFront logic helper used here
            availability: p.stock <= 0 ? "Out of Stock" : (p.stock < 10 ? `Only ${p.stock} left` : "Available"),
            ratingCount: Math.floor(Math.random() * (200 - 50) + 50)
        }));

        res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🌟 3. UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
    try {
        let updateData = { ...req.body };

        if (updateData.variants && typeof updateData.variants === 'string') {
            updateData.variants = JSON.parse(updateData.variants);
        }

        if (req.files) {
            if (req.files['images']) {
                updateData.images = req.files['images'].map(f => f.key); // Use S3 key
            }
            if (req.files['video']) {
                updateData.video = req.files['video'][0].key; // Use S3 key
            }
        }

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

// 🌟 4. DELETE PRODUCT (S3 Cleanup Added)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        // 🔥 Senior Peer Logic: Cloud assets cleanup
        const deleteParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Delete: {
                Objects: [
                    ...product.images.map(img => ({ Key: img })),
                    { Key: product.video }
                ].filter(obj => obj.Key)
            }
        };

        if (deleteParams.Delete.Objects.length > 0) {
            await s3.deleteObjects(deleteParams).promise();
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Product and Cloud assets deleted successfully!" });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

// 🌟 5. GET PRODUCT BY ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category subCategory seller');
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        if (product.seller && product.seller.status === 'inactive') {
            return res.status(403).json({ success: false, message: "Product currently unavailable" });
        }
        res.status(200).json({ success: true, data: formatProductMedia(product) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 🌟 6. GET MY PRODUCTS (Seller View)
exports.getMyProducts = async (req, res) => {
    try {
        if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
        const products = await Product.find({ seller: req.user.id, isArchived: { $ne: true } }).populate('category subCategory').lean();
        
        const data = products.map(p => formatProductMedia(p));
        res.json({ success: true, count: data.length, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 🌟 7. GET SIMILAR PRODUCTS
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

        const data = products.map(p => formatProductMedia(p));
        res.json({ success: true, data });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};