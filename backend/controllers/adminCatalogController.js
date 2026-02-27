const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const MasterProduct = require('../models/MasterProduct'); 
const Product = require('../models/Product'); 
const HsnMaster = require('../models/HsnMaster');
const { s3 } = require('../middleware/multerConfig');
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

// ================= 🌟 HSN MASTER (CRUD) =================
exports.addHsnCode = async (req, res) => {
    try {
        const hsn = new HsnMaster(req.body);
        await hsn.save();
        res.status(201).json({ success: true, data: hsn });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getAllHsnForAdmin = async (req, res) => {
    try {
        const list = await HsnMaster.find(); 
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getActiveHsnOnly = async (req, res) => {
    try {
        const list = await HsnMaster.find({ status: { $ne: false } }); 
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateHsnCode = async (req, res) => {
    try {
        const hsn = await HsnMaster.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: hsn });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteHsnCode = async (req, res) => {
    try {
        await HsnMaster.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "HSN Code deleted" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// ================= 🌟 CATEGORY =================
exports.getPermanentCategories = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const cats = await Category.find({ isPermanent: true }).lean();
        const data = cats.map(cat => ({
            ...cat, image: cat.image ? (cat.image.startsWith('http') ? cat.image : CF_URL + cat.image) : ""
        }));
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createCategory = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Image upload failed" });
    const category = new Category({ ...req.body, image: req.file.key, isActive: true });
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getCategories = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const cats = await Category.find().lean();
        const data = cats.map(cat => ({
            ...cat, image: cat.image ? (cat.image.startsWith('http') ? cat.image : CF_URL + cat.image) : ""
        }));
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateCategory = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = req.file.key;
        const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: category });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Category deleted" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// ================= 🌟 SUB-CATEGORY =================
exports.createSubCategory = async (req, res) => {
    try {
        const subCat = new SubCategory({ ...req.body, image: req.file ? req.file.key : null });
        await subCat.save();
        res.status(201).json({ success: true, data: subCat });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getAllSubCategories = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const subs = await SubCategory.find().populate('category').lean();
        const data = subs.map(sub => ({
            ...sub, image: sub.image ? (sub.image.startsWith('http') ? sub.image : CF_URL + sub.image) : ""
        }));
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getSubsByCategory = async (req, res) => {
    try {
        const CF_URL = process.env.CLOUDFRONT_URL;
        const subs = await SubCategory.find({ category: req.params.catId }).lean();
        const data = subs.map(sub => ({
            ...sub, image: sub.image ? (sub.image.startsWith('http') ? sub.image : CF_URL + sub.image) : ""
        }));
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateSubCategory = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = req.file.key;
        const sub = await SubCategory.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: sub });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteSubCategory = async (req, res) => {
    try {
        await SubCategory.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Sub-category deleted" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// ================= 🌟 MASTER PRODUCT LIST (HSN Mapping ONLY here) =================

exports.addMasterProduct = async (req, res) => {
    try {
        const { name, category, subCategory, hsnMasterId } = req.body;
        const newEntry = new MasterProduct({
            name, category, subCategory, hsnMasterId,
            isApproved: true, status: 'active'
        });
        await newEntry.save();
        res.status(201).json({ success: true, message: "Catalog updated!", data: newEntry });
    } catch (err) { res.status(400).json({ error: err.message }); }
};
// 🌟 1. APPROVE TOKEN: Seller request-ah approve mattum pannum (MasterProduct table)
exports.approveProductToken = async (req, res) => {
    try {
        const { productId } = req.body; 
        
        if (!productId) return res.status(400).json({ success: false, message: "Product ID is required" });

        // 🔥 FIX: Seller request 'MasterProduct' table-la pending-ah vizhuradhala anga dhaan check pannanum
        const requestProduct = await MasterProduct.findById(productId.trim());

        if (!requestProduct) return res.status(404).json({ success: false, message: "Request record not found in MasterProduct table" });

        requestProduct.isApproved = true; 
        requestProduct.status = 'approved'; 
        await requestProduct.save();

        res.json({ success: true, message: "Token marked as Approved. Now you can map HSN manually." });
    } catch (err) { res.status(400).json({ success: false, error: "Invalid ID Format: " + err.message }); }
};

// 🌟 2. ADD TO MASTER: Approved token-ah dropdown-la select panni manual-ah HSN map pandradhu
exports.addApprovedToMaster = async (req, res) => {
    try {
        const { productId, hsnMasterId } = req.body; 

        if (!productId || !hsnMasterId) return res.status(400).json({ success: false, message: "Both Product ID and HSN ID are required" });

        // MasterProduct-la irukka pending record-ah fetch pannu
        const requestProduct = await MasterProduct.findById(productId.trim());
        const hsnDoc = await HsnMaster.findById(hsnMasterId.trim());

        if (!requestProduct || !hsnDoc) {
            return res.status(404).json({ success: false, message: "Record not found. Check if the IDs are correct." });
        }

        // Manual mapping update
        requestProduct.hsnMasterId = hsnMasterId.trim();
        requestProduct.isApproved = true;
        requestProduct.status = 'active'; // Ippo dhaan seller dropdown-la varum
        
        await requestProduct.save();

        res.json({ 
            success: true, 
            message: "Successfully mapped HSN and activated in Catalog!", 
            data: requestProduct 
        });
    } catch (err) { res.status(400).json({ success: false, error: "Mapping Error: " + err.message }); }
};
exports.rejectProductRequest = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.body.productId);
        res.json({ success: true, message: "Request rejected and deleted." });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getMasterListBySubCategory = async (req, res) => {
    try {
        const list = await MasterProduct.find({ subCategory: req.params.subCatId })
            .populate('hsnMasterId') 
            .lean();
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateMasterProduct = async (req, res) => {
    try {
        const updated = await MasterProduct.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updated });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteMasterProduct = async (req, res) => {
    try {
        await MasterProduct.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Removed from Catalog" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getPendingProductTokens = async (req, res) => {
    try {
        const pending = await Product.find({ isApproved: false, seller: { $ne: null } })
            .populate('seller', 'shopName').populate('category subCategory', 'name').sort({ createdAt: -1 });
        res.json({ success: true, data: pending });
    } catch (err) { res.status(500).json({ error: err.message }); }
};