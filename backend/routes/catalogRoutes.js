// routes/catalogRoutes.js
const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');

// Category Routes
router.post('/categories', async (req, res) => {
    const cat = new Category(req.body);
    await cat.save();
    res.status(201).json(cat);
});

router.get('/categories', async (req, res) => {
    const cats = await Category.find({ isActive: true });
    res.json({ success: true, data: cats });
});

// Sub-Category Routes
router.post('/sub-categories', async (req, res) => {
    const sub = new SubCategory(req.body);
    await sub.save();
    res.status(201).json(sub);
});

router.get('/sub-categories/:catId', async (req, res) => {
    const subs = await SubCategory.find({ category: req.params.catId });
    res.json({ success: true, data: subs });
});

module.exports = router;