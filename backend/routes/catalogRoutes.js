const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const upload = require('../middleware/multerConfig'); 


router.post('/categories', upload.single('image'), async (req, res) => {
    try {
        const { name, description } = req.body;
        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        if (!imagePath) return res.status(400).json({ error: "Image file is required" });

        const cat = new Category({ name, description, image: imagePath });
        await cat.save();
        res.status(201).json({ success: true, data: cat });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


router.get('/categories', async (req, res) => {
    try {
        const cats = await Category.find({ isActive: true });
        res.json({ success: true, data: cats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.post('/sub-categories', upload.single('image'), async (req, res) => {
    try {
        const { name, category, description, hsnCode } = req.body;
        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

        const sub = new SubCategory({ name, category, description, hsnCode, image: imagePath });
        await sub.save();
        res.status(201).json({ success: true, data: sub });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


router.get('/sub-categories/:catId', async (req, res) => {
    try {
       
        const subs = await SubCategory.find({ category: req.params.catId }).populate('category');
        res.json({ success: true, data: subs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 