const Product = require('../models/Product');
const Seller = require('../models/Seller');
const SubCategory = require('../models/SubCategory');

// 🌟 1. CREATE PRODUCT (With Inheritance & Media)
exports.createProduct = async (req, res) => {
    try {
        // 🌟 லாகின் செய்யாமல் டெஸ்ட் செய்யும்போது செல்லர் ஐடியை பாடியில் இருந்து எடுக்கும் வசதி
        const sellerId = req.user?.id || req.body.seller; 
        const seller = await Seller.findById(sellerId);
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

        const subCat = await SubCategory.findById(req.body.subCategory);
        if (!subCat) return res.status(400).json({ success: false, message: "Invalid SubCategory" });

        // 🌟 செக்: சப்-கேட்டகரியில் gstRate அல்லது gstPercentage எது இருந்தாலும் அதை எடுக்கும்படி மாற்றுங்கள்
        const taxRate = subCat.gstRate || subCat.gstPercentage;
        
        if (!taxRate) {
            return res.status(400).json({ 
                success: false, 
                message: "Selected SubCategory does not have a GST rate. Please check HSN Master." 
            });
        }

        const images = req.files['images'] ? req.files['images'].map(f => f.filename) : [];
        const video = req.files['video'] ? req.files['video'][0].filename : "";

        const discount = req.body.mrp > req.body.price 
            ? Math.round(((req.body.mrp - req.body.price) / req.body.mrp) * 100) 
            : 0;

        const product = new Product({
            ...req.body,
            hsnCode: subCat.hsnCode, 
            gstPercentage: taxRate, // 🌟 இப்போது இது காலியாக இருக்காது
            discountPercentage: discount,
            images,
            video,
            seller: seller._id,
            variants: req.body.variants ? JSON.parse(req.body.variants) : [] 
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
        const { category, subCategory, search } = req.query;
        let query = { isArchived: false };

        if (category) query.category = category;
        if (subCategory) query.subCategory = subCategory;
        if (search) query.name = { $regex: search, $options: 'i' };

        const products = await Product.find(query)
            .populate('category subCategory', 'name image')
            .populate('seller', 'shopName name address')
            .sort({ createdAt: -1 });

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        const data = products.map(p => ({
            ...p._doc,
            images: p.images.map(img => baseUrl + img),
            video: p.video ? baseUrl + p.video : ""
        }));

        res.json({ success: true, count: data.length, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 🌟 3. GET PRODUCT BY ID (Detailed View)
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category subCategory')
            .populate('seller', 'name shopName phone address fssaiNumber');

        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        const updatedProduct = {
            ...product._doc,
            images: product.images.map(img => baseUrl + img),
            video: product.video ? baseUrl + product.video : ""
        };

        res.status(200).json({ success: true, data: updatedProduct });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 🌟 4. GET MY PRODUCTS (Seller View Only)
exports.getMyProducts = async (req, res) => {
    try {
        const products = await Product.find({ seller: req.user.id, isArchived: false })
            .populate('category subCategory');
        res.json({ success: true, data: products });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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

// 🌟 6. UPDATE & ARCHIVE (CRUD)
exports.updateProduct = async (req, res) => {
    try {
        const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updated });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, { isArchived: true });
        res.json({ success: true, message: "Product Archived successfully" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 🌟 7. RATE PRODUCT
exports.rateProduct = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const product = await Product.findById(req.params.id);
        
        product.ratings.push({ userId: req.user.id, rating, comment });
        const total = product.ratings.reduce((acc, curr) => acc + curr.rating, 0);
        product.averageRating = (total / product.ratings.length).toFixed(1);

        await product.save();
        res.json({ success: true, averageRating: product.averageRating });
    } catch (err) { res.status(500).json({ error: err.message }); }
};