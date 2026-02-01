const Product = require('../models/Product');
const Seller = require('../models/Seller');


exports.createProduct = async (req, res) => {
    try {
        
        const seller = await Seller.findById(req.body.seller || req.user?.id);
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

        
        const foodCategories = ["Food", "Beverages", "Snacks", "Health Supplements"];
        if (foodCategories.includes(req.body.categoryName) && !seller.fssaiNumber) {
            return res.status(400).json({ 
                success: false, 
                message: "fssaiNumber is required for food category products." 
            });
        }

       
        const images = req.files['images'] 
            ? req.files['images'].map(f => f.filename) 
            : [];
        
        const video = req.files['video'] ? req.files['video'][0].filename : "";

        const product = new Product({
            ...req.body,
            images,
            video,
            category: req.body.category, 
            subCategory: req.body.subCategory,
            seller: seller._id 
        });

        await product.save();
        res.status(201).json({ success: true, data: product });
    } catch (err) { 
        res.status(400).json({ success: false, error: err.message }); 
    }
};


exports.getAllProducts = async (req, res) => {
    try {
        const { category, subCategory, search } = req.query;
        let query = { isArchived: false };

        if (category) query.category = category;
        if (subCategory) query.subCategory = subCategory;
        if (search) query.name = { $regex: search, $options: 'i' };

        const products = await Product.find(query)
            .populate('category', 'name image')
            .populate('subCategory', 'name image hsnCode')
            .populate('seller', 'shopName name address') 
            .sort({ createdAt: -1 });

       
        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        
        const productsWithUrls = products.map(product => ({
            ...product._doc,
            images: product.images.map(img => baseUrl + img),
            video: product.video ? baseUrl + product.video : ""
        }));

        res.status(200).json({ success: true, count: productsWithUrls.length, data: productsWithUrls });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category subCategory')
            .populate('seller', 'name shopName phone address fssaiNumber'); 

        if (!product) return res.status(404).json({ message: "Product not found" });

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        const updatedProduct = {
            ...product._doc,
            images: product.images.map(img => baseUrl + img),
            video: product.video ? baseUrl + product.video : ""
        };

        res.status(200).json({ success: true, data: updatedProduct });
    } catch (err) { res.status(500).json({ error: err.message }); }
};


exports.updateProduct = async (req, res) => {
    try {
        const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: updated });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};


exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndUpdate(req.params.id, { isArchived: true });
        res.status(200).json({ success: true, message: "Product Archived successfully" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getSimilarProducts = async (req, res) => {
    try {
        const currentProductId = req.params.id;
        const { category } = req.query; 

        
        const products = await Product.find({ 
            category: category, 
            _id: { $ne: currentProductId },
            isArchived: false 
        })
        .limit(10)
        .sort({ createdAt: -1 });

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        
       
        const productsWithUrls = products.map(product => ({
            ...product._doc,
            images: product.images.map(img => baseUrl + img)
        }));

        res.status(200).json({ success: true, data: productsWithUrls });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};