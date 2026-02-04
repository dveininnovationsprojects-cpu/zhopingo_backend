const express = require('express');
const router = express.Router();
const upload = require('../middleware/multerConfig');
const catalogController = require('../controllers/adminCatalogController');

// --- HSN Master ---
router.post('/hsn-master', catalogController.addHsnCode);
router.get('/hsn-master', catalogController.getAllHsn);
router.put('/hsn-master/:id', catalogController.updateHsnStatus);

// --- Categories ---
router.post('/categories', upload.single('image'), catalogController.createCategory);
router.get('/categories', catalogController.getCategories);
router.put('/categories/:id', upload.single('image'), catalogController.updateCategory);
router.delete('/categories/:id', catalogController.deleteCategory);

// --- Sub-Categories ---
router.post('/sub-categories', upload.single('image'), catalogController.createSubCategory);
router.get('/sub-categories/all', catalogController.getAllSubCategories); 
router.get('/sub-categories/:catId', catalogController.getSubsByCategory);
router.put('/sub-categories/:id', upload.single('image'), catalogController.updateSubCategory);
router.delete('/sub-categories/:id', catalogController.deleteSubCategory);

module.exports = router;