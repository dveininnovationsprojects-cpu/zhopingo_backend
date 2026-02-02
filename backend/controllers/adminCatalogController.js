const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');

// --- CATEGORY CONTROLLERS ---

exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
        if (!imagePath) return res.status(400).json({ error: "Image file is required" });

        const category = new Category({ name, description, image: imagePath });
        await category.save();
        res.status(201).json({ success: true, data: category });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getCategories = async (req, res) => {
    try {
        const cats = await Category.find({ isActive: true });
        res.status(200).json({ success: true, data: cats });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateCategory = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = `/uploads/${req.file.filename}`;
        
        const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: category });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Category deleted successfully" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// --- SUB-CATEGORY CONTROLLERS ---

exports.createSubCategory = async (req, res) => {
    try {
        const { name, category, description, hsnCode } = req.body;
        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        const subCat = new SubCategory({ name, category, description, hsnCode, image: imagePath });
        await subCat.save();
        res.status(201).json({ success: true, data: subCat });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// புதிய API: அனைத்து சப்-கேட்டகிரிகளையும் பார்க்க
exports.getAllSubCategories = async (req, res) => {
    try {
        const subs = await SubCategory.find().populate('category');
        res.status(200).json({ success: true, count: subs.length, data: subs });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getSubsByCategory = async (req, res) => {
    try {
        const subs = await SubCategory.find({ category: req.params.catId }).populate('category');
        res.status(200).json({ success: true, data: subs });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateSubCategory = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = `/uploads/${req.file.filename}`;
        
        const sub = await SubCategory.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('category');
        res.json({ success: true, data: sub });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteSubCategory = async (req, res) => {
    try {
        await SubCategory.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Sub-category deleted successfully" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};