// const express = require('express');
// const router = express.Router();
// const upload = require('../middleware/multerConfig');
// const catalogController = require('../controllers/adminCatalogController');

// // --- HSN Master ---
// router.post('/hsn-master', catalogController.addHsnCode);
// router.get('/hsn-master', catalogController.getAllHsnForAdmin);
// router.get('/hsn-master/active', catalogController.getActiveHsnOnly);
// router.put('/hsn-master/:id', catalogController.updateHsnStatus);
// router.delete('/hsn-master/:id', catalogController.deleteHsnCode);

// // --- Categories ---
// router.post('/categories', upload.single('image'), catalogController.createCategory);
// router.get('/categories', catalogController.getCategories);
// router.put('/categories/:id', upload.single('image'), catalogController.updateCategory);
// router.delete('/categories/:id', catalogController.deleteCategory);

// // --- Sub-Categories ---
// router.post('/sub-categories', upload.single('image'), catalogController.createSubCategory);
// router.get('/sub-categories/all', catalogController.getAllSubCategories); 
// router.get('/sub-categories/:catId', catalogController.getSubsByCategory);
// router.put('/sub-categories/:id', upload.single('image'), catalogController.updateSubCategory);
// router.delete('/sub-categories/:id', catalogController.deleteSubCategory);

// module.exports = router;




const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/adminCatalogController');

// 🌟 UPDATE THIS IMPORT: Use curly braces to get upload and processImages
const { upload, processImages } = require('../middleware/multerConfig'); 

// --- HSN Master ---
router.post('/hsn-master', catalogController.addHsnCode);
router.get('/hsn-master', catalogController.getAllHsnForAdmin);
router.get('/hsn-master/active', catalogController.getActiveHsnOnly);
router.put('/hsn-master/:id', catalogController.updateHsnStatus);
router.delete('/hsn-master/:id', catalogController.deleteHsnCode);

// --- Categories ---

router.post(
  "/categories",
  upload.single("image"),   
  processImages,
  catalogController.createCategory
);

router.get('/categories', catalogController.getCategories);
router.put('/categories/:id', upload.single('image'), processImages, catalogController.updateCategory);
router.delete('/categories/:id', catalogController.deleteCategory);

// --- Sub-Categories ---
// 🌟 Added processImages after upload.single
router.post('/sub-categories', upload.single('image'), processImages, catalogController.createSubCategory);
router.get('/sub-categories/all', catalogController.getAllSubCategories); 
router.get('/sub-categories/:catId', catalogController.getSubsByCategory);
router.put('/sub-categories/:id', upload.single('image'), processImages, catalogController.updateSubCategory);
router.delete('/sub-categories/:id', catalogController.deleteSubCategory);

module.exports = router;