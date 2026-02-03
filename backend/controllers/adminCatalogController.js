const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const HsnMaster = require('../models/HsnMaster');

// ================= 🌟 HSN MASTER FEATURES =================
exports.addHsnCode = async (req, res) => {
    try {
        const hsn = new HsnMaster(req.body);
        await hsn.save();
        res.status(201).json({ success: true, data: hsn });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getAllHsn = async (req, res) => {
    try {
        const list = await HsnMaster.find();
        res.json({ success: true, data: list });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ================= 🌟 CATEGORY FEATURES =================
exports.createCategory = async (req, res) => {
    try {
        const { name, description, hsnCode, gstRate } = req.body;
        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
        if (!imagePath) return res.status(400).json({ error: "Image is required" });

        const category = new Category({ name, description, hsnCode, gstRate, image: imagePath });
        await category.save();
        res.status(201).json({ success: true, data: category });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getCategories = async (req, res) => {
    try {
        const cats = await Category.find();
        res.json({ success: true, data: cats });
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
        res.json({ success: true, message: "Category deleted" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// ================= 🌟 SUB-CATEGORY FEATURES =================
exports.createSubCategory = async (req, res) => {
    try {
        const { name, category, description } = req.body;
        const parent = await Category.findById(category);
        if (!parent) return res.status(404).json({ error: "Category not found" });

        const subCat = new SubCategory({ 
            name, category, description,
            hsnCode: parent.hsnCode, // Inherited from Category
            gstRate: parent.gstRate, // Inherited from Category
            image: req.file ? `/uploads/${req.file.filename}` : null 
        });
        await subCat.save();
        res.status(201).json({ success: true, data: subCat });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.getAllSubCategories = async (req, res) => {
    try {
        const subs = await SubCategory.find().populate('category');
        res.json({ success: true, data: subs });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getSubsByCategory = async (req, res) => {
    try {
        const subs = await SubCategory.find({ category: req.params.catId }).populate('category');
        res.json({ success: true, data: subs });
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
        res.json({ success: true, message: "Sub-category deleted" });
    } catch (err) { res.status(400).json({ error: err.message }); }
};