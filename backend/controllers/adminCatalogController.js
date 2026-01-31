// controllers/adminCatalogController.js
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');

// 1. ADD CATEGORY
exports.createCategory = async (req, res) => {
    try {
        const category = new Category(req.body);
        await category.save();
        res.status(201).json({ success: true, data: category });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// 2. GET ALL CATEGORIES (For Home Screen)
exports.getCategories = async (req, res) => {
    try {
        const cats = await Category.find({ isActive: true });
        res.status(200).json({ success: true, data: cats });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. ADD SUB-CATEGORY
exports.createSubCategory = async (req, res) => {
    try {
        const subCat = new SubCategory(req.body);
        await subCat.save();
        res.status(201).json({ success: true, data: subCat });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// 4. GET SUB-CATEGORIES BY CATEGORY ID
exports.getSubsByCategory = async (req, res) => {
    try {
        const subs = await SubCategory.find({ category: req.params.catId });
        res.status(200).json({ success: true, data: subs });
    } catch (err) { res.status(500).json({ error: err.message }); }
};