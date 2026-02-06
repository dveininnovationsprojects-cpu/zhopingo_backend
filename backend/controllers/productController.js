
const Product = require('../models/Product');
const Seller = require('../models/Seller');
const SubCategory = require('../models/SubCategory');

// 🌟 Helper: இமேஜ் மற்றும் வீடியோ லிங்க்குகளை முழுமையான URL ஆக மாற்ற
const formatProductMedia = (product, req) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    // Mongoose ஆப்ஜெக்ட்டை சுத்தமான JSON ஆக மாற்றுதல்
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

// --- 🌟 1. CREATE PRODUCT ---
exports.createProduct = async (req, res) => {
    try {
        const sellerId = req.user?.id || req.body.seller; 
        const seller = await Seller.findById(sellerId);
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

        const subCat = await SubCategory.findById(req.body.subCategory);
        if (!subCat) return res.status(400).json({ success: false, message: "Invalid SubCategory" });

        const taxRate = subCat.gstRate || subCat.gstPercentage;

        // மல்டர் மூலம் வந்த ஃபைல் பெயர்களை அரே-வாக எடுத்தல்
        const images = req.files['images'] ? req.files['images'].map(f => f.filename) : [];
        const video = req.files['video'] ? req.files['video'][0].filename : "";

        const discount = req.body.mrp > req.body.price 
            ? Math.round(((req.body.mrp - req.body.price) / req.body.mrp) * 100) 
            : 0;

        const product = new Product({
            ...req.body,
            hsnCode: subCat.hsnCode, 
            gstPercentage: taxRate,
            discountPercentage: discount,
            images,
            video,
            seller: seller._id,
            variants: req.body.variants ? (typeof req.body.variants === 'string' ? JSON.parse(req.body.variants) : req.body.variants) : [] 
        });

        await product.save();
        res.status(201).json({ success: true, data: product });
    } catch (err) { 
        res.status(400).json({ success: false, error: err.message }); 
    }
};

// --- 🌟 2. GET ALL PRODUCTS ---
exports.getAllProducts = async (req, res) => {
    try {
        const { category, subCategory, search } = req.query;
        let query = { isArchived: { $ne: true } };

        if (category) query.category = category;
        if (subCategory) query.subCategory = subCategory;
        if (search) query.name = { $regex: search, $options: "i" };

        const products = await Product.find(query)
            .populate("category subCategory", "name image")
            .populate("seller", "shopName name address")
            .sort({ createdAt: -1 });

        const data = products.map(p => formatProductMedia(p, req));
        res.status(200).json({ success: true, count: data.length, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// // 🌟 4. GET MY PRODUCTS (Seller Dashboard)
exports.getMyProducts = async (req, res) => {
    try {
        const products = await Product.find({ seller: req.user.id, isArchived: { $ne: true } })
            .populate('category subCategory');
        res.json({ success: true, data: products });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// --- 🌟 5. UPDATE & DELETE ---
exports.updateProduct = async (req, res) => {
    try {
        const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updated });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.deleteProduct = async (req, res) => {
    try {
        // 1. முதலில் அந்த தயாரிப்பைக் கண்டறியவும்
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // 2. இமேஜ்களை சர்வரில் இருந்து நீக்குதல்
        if (product.images && product.images.length > 0) {
            product.images.forEach(imgName => {
                // உங்கள் multerConfig படி பாத்: public/uploads/
                const imagePath = path.join(__dirname, '../public/uploads/', imgName);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath); // ஃபைலை டெலீட் செய்யும்
                }
            });
        }

        // 3. வீடியோவை சர்வரில் இருந்து நீக்குதல்
        if (product.video) {
            const videoPath = path.join(__dirname, '../public/uploads/', product.video);
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath); // வீடியோவை டெலீட் செய்யும்
            }
        }

        // 4. இப்போது டேட்டாபேஸில் இருந்து நீக்கவும் (முழுமையாக நீக்க Delete பயன்படுத்தவும்)
        await Product.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: "Product and its media files deleted successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


// 🌟 5. GET SIMILAR PRODUCTS
exports.getSimilarProducts = async (req, res) => {
    try {
        const { category } = req.query;
        const products = await Product.find({ 
            category: category, 
            _id: { $ne: req.params.id },
            isArchived: false 
        }).limit(10).sort({ createdAt: -1 });

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        const data = products.map(p => ({
            ...p._doc,
            images: p.images.map(img => baseUrl + img)
        }));

        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};



// const Product = require('../models/Product');
// const Seller = require('../models/Seller');
// const SubCategory = require('../models/SubCategory');

// // 🌟 1. CREATE PRODUCT (With Inheritance & Media)
// exports.createProduct = async (req, res) => {
//     try {
//         // 🌟 லாகின் செய்யாமல் டெஸ்ட் செய்யும்போது செல்லர் ஐடியை பாடியில் இருந்து எடுக்கும் வசதி
//         const sellerId = req.user?.id || req.body.seller; 
//         const seller = await Seller.findById(sellerId);
//         if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

//         const subCat = await SubCategory.findById(req.body.subCategory);
//         if (!subCat) return res.status(400).json({ success: false, message: "Invalid SubCategory" });

//         // 🌟 செக்: சப்-கேட்டகரியில் gstRate அல்லது gstPercentage எது இருந்தாலும் அதை எடுக்கும்படி மாற்றுங்கள்
//         const taxRate = subCat.gstRate || subCat.gstPercentage;
        
//         if (!taxRate) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: "Selected SubCategory does not have a GST rate. Please check HSN Master." 
//             });
//         }

//         const images = req.files['images'] ? req.files['images'].map(f => f.filename) : [];
//         const video = req.files['video'] ? req.files['video'][0].filename : "";

//         const discount = req.body.mrp > req.body.price 
//             ? Math.round(((req.body.mrp - req.body.price) / req.body.mrp) * 100) 
//             : 0;

//         const product = new Product({
//             ...req.body,
//             hsnCode: subCat.hsnCode, 
//             gstPercentage: taxRate, // 🌟 இப்போது இது காலியாக இருக்காது
//             discountPercentage: discount,
//             images,
//             video,
//             seller: seller._id,
//             variants: req.body.variants ? JSON.parse(req.body.variants) : [] 
//         });

//         await product.save();
//         res.status(201).json({ success: true, data: product });
//     } catch (err) { 
//         res.status(400).json({ success: false, error: err.message }); 
//     }
// };
// // 🌟 GET ALL PRODUCTS (Customer View)
// // 🌟 2. GET ALL PRODUCTS (முழுமையான 5000+ தயாரிப்புகளை எடுக்கும்)
// exports.getAllProducts = async (req, res) => {
//     try {
//         const { category, subCategory, search } = req.query;
        
//         // 🌟 திருத்தம்: isArchived 'true' இல்லாத அனைத்தையும் எடுக்கும் (சீட் டேட்டாவையும் சேர்த்து)
//         let query = { isArchived: { $ne: true } }; 

//         if (category) query.category = category;
//         if (subCategory) query.subCategory = subCategory;
//         if (search) query.name = { $regex: search, $options: 'i' };

//         const products = await Product.find(query)
//             .populate('category subCategory', 'name image')
//             .populate('seller', 'shopName name address')
//             .sort({ createdAt: -1 });

//         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        
//         const data = products.map(p => {
//             const doc = p._doc;
//             return {
//                 ...doc,
//                 images: doc.images ? doc.images.map(img => formatMediaUrl(img, baseUrl)) : [],
//                 video: formatMediaUrl(doc.video, baseUrl)
//             };
//         });

//         res.json({ success: true, count: data.length, data: data });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// // 🌟 3. GET PRODUCT BY ID (Detailed View)
// exports.getProductById = async (req, res) => {
//     try {
//         const product = await Product.findById(req.params.id)
//             .populate('category subCategory')
//             .populate('seller', 'name shopName phone address fssaiNumber');

//         if (!product) return res.status(404).json({ success: false, message: "Product not found" });

//         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
//         const updatedProduct = {
//             ...product._doc,
//             images: product.images ? product.images.map(img => formatMediaUrl(img, baseUrl)) : [],
//             video: formatMediaUrl(product.video, baseUrl)
//         };

//         res.status(200).json({ success: true, data: updatedProduct });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// // 🌟 4. GET MY PRODUCTS (Seller Dashboard)
// exports.getMyProducts = async (req, res) => {
//     try {
//         const products = await Product.find({ seller: req.user.id, isArchived: { $ne: true } })
//             .populate('category subCategory');
//         res.json({ success: true, data: products });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// // 🌟 5. GET SIMILAR PRODUCTS (ரேண்டம் தயாரிப்புகளுடன்)
// exports.getSimilarProducts = async (req, res) => {
//     try {
//         const { category } = req.query;
//         let query = { isArchived: { $ne: true }, _id: { $ne: req.params.id } };

//         // கேட்டகிரி இருந்தால் அதே கேட்டகிரி, இல்லையென்றால் ரேண்டம் தயாரிப்புகள்
//         if (category) query.category = category;

//         const products = await Product.find(query).limit(10).sort({ createdAt: -1 });

//         const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
//         const data = products.map(p => ({
//             ...p._doc,
//             images: p.images ? p.images.map(img => formatMediaUrl(img, baseUrl)) : []
//         }));

//         res.json({ success: true, data });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// // 🌟 6. UPDATE & ARCHIVE (CRUD)
// exports.updateProduct = async (req, res) => {
//     try {
//         const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         res.json({ success: true, data: updated });
//     } catch (err) { res.status(400).json({ success: false, error: err.message }); }
// };

// exports.deleteProduct = async (req, res) => {
//     try {
//         await Product.findByIdAndUpdate(req.params.id, { isArchived: true });
//         res.json({ success: true, message: "Product Archived successfully" });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// // 🌟 7. RATE PRODUCT
// exports.rateProduct = async (req, res) => {
//     try {
//         const { rating, comment } = req.body;
//         const product = await Product.findById(req.params.id);
        
//         product.ratings.push({ userId: req.user.id, rating, comment });
//         const total = product.ratings.reduce((acc, curr) => acc + curr.rating, 0);
//         product.averageRating = (total / product.ratings.length).toFixed(1);

//         await product.save();
//         res.json({ success: true, averageRating: product.averageRating });
//     } catch (err) { res.status(500).json({ error: err.message }); }
// };