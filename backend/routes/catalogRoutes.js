const express = require('express');
const router = express.Router();
const upload = require('../middleware/multerConfig');
const catalogController = require('../controllers/adminCatalogController');

// --- Category Routes ---
router.post('/categories', upload.single('image'), catalogController.createCategory);
router.get('/categories', catalogController.getCategories);
router.put('/categories/:id', upload.single('image'), catalogController.updateCategory);
router.delete('/categories/:id', catalogController.deleteCategory);

// --- Sub-Category Routes ---
router.post('/sub-categories', upload.single('image'), catalogController.createSubCategory);

// 🌟 முக்கியம்: '/all' ரூட் எப்போதுமே குறிப்பிட்ட ID ரூட்டிற்கு மேலே இருக்க வேண்டும்
router.get('/sub-categories/all', catalogController.getAllSubCategories); 

router.get('/sub-categories/:catId', catalogController.getSubsByCategory);
router.put('/sub-categories/:id', upload.single('image'), catalogController.updateSubCategory);
router.delete('/sub-categories/:id', catalogController.deleteSubCategory);

module.exports = router;