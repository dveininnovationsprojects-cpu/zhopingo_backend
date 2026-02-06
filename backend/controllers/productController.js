const Product = require('../models/Product');
const Seller = require('../models/Seller');
const SubCategory = require('../models/SubCategory');


exports.createProduct = async (req, res) => {
    try {
       
        const sellerId = req.user?.id || req.body.seller; 
        const seller = await Seller.findById(sellerId);
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

        const subCat = await SubCategory.findById(req.body.subCategory);
        if (!subCat) return res.status(400).json({ success: false, message: "Invalid SubCategory" });

       
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
            gstPercentage: taxRate, 
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


// exports.getAllProducts = async (req, res) => {
//   try {
//     const { category, subCategory, search } = req.query;

//     let query = { isArchived: { $ne: true } };

//     if (category) query.category = category;
//     if (subCategory) query.subCategory = subCategory;
//     if (search) query.name = { $regex: search, $options: "i" };

//     const products = await Product.find(query)
//       .populate("category subCategory", "name image")
//       .populate("seller", "shopName name address")
//       .sort({ createdAt: -1 });

//     const baseUrl = `${req.protocol}://${req.get("host")}/uploads/`;

//     const data = products.map(p => ({
//       ...p._doc,
//       images: (p.images || []).map(img =>
//         img.startsWith("http") ? img : baseUrl + img
//       ),
//       video: p.video
//         ? (p.video.startsWith("http") ? p.video : baseUrl + p.video)
//         : ""
//     }));

//     res.status(200).json({
//       success: true,
//       count: data.length,
//       data
//     });

//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

const formatProductMedia = (product, req) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const doc = product._doc || product;

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


exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category subCategory')
            .populate('seller', 'name shopName phone address fssaiNumber');

        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        const data = formatProductMedia(product, req);

        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.getMyProducts = async (req, res) => {
    try {
        
        const products = await Product.find({ seller: req.user.id, isArchived: false })
            .populate('category subCategory');

        const data = products.map(p => formatProductMedia(p, req));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.getSimilarProducts = async (req, res) => {
    try {
        const { category } = req.query;
        const products = await Product.find({ 
            category: category, 
            _id: { $ne: req.params.id }, 
            isArchived: false 
        }).limit(10).sort({ createdAt: -1 });

        const data = products.map(p => formatProductMedia(p, req));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};