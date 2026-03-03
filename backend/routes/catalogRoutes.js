// const express = require('express');
// const router = express.Router();
// const catalogController = require('../controllers/adminCatalogController');
// const { upload, processImages } = require('../middleware/multerConfig'); 

// // --- HSN Master ---
// router.post('/hsn-master', catalogController.addHsnCode);
// router.get('/hsn-master', catalogController.getAllHsnForAdmin);
// router.get('/hsn-master/active', catalogController.getActiveHsnOnly);
// router.put('/hsn-master/:id', catalogController.updateHsnCode);
// router.delete('/hsn-master/:id', catalogController.deleteHsnCode);

// // --- Categories ---
// router.get('/categories/permanent', catalogController.getPermanentCategories);
// router.post("/categories", upload.single("image"), processImages, catalogController.createCategory);
// router.get('/categories', catalogController.getCategories);
// router.put('/categories/:id', upload.single('image'), processImages, catalogController.updateCategory);
// router.delete('/categories/:id', catalogController.deleteCategory);

// // --- Sub-Categories ---
// router.post('/sub-categories', upload.single('image'), processImages, catalogController.createSubCategory);
// router.get('/sub-categories/all', catalogController.getAllSubCategories); 
// router.get('/sub-categories/:catId', catalogController.getSubsByCategory);
// router.put('/sub-categories/:id', upload.single('image'), processImages, catalogController.updateSubCategory);
// router.delete('/sub-categories/:id', catalogController.deleteSubCategory);

// // --- Master Product List (Catalog) ---
// router.post('/master-product/add', catalogController.addMasterProduct); 
// router.get('/master-list/:subCatId', catalogController.getMasterListBySubCategory);
// router.put('/master-product/:id', catalogController.updateMasterProduct);
// router.delete('/master-product/:id', catalogController.deleteMasterProduct);
// // Master List-ah full-ah edukka (Pagination and Filtering ready)
// router.get('/master-products/all', catalogController.getAllMasterProducts);

// // --- Tokens / Seller Requests ---
// router.get('/tokens/pending', catalogController.getPendingProductTokens);
// router.put('/tokens/approve-token', catalogController.approveProductToken); // 🌟 Just marking as approved
// router.post('/tokens/add-to-master', catalogController.addApprovedToMaster);
// router.put('/tokens/reject', catalogController.rejectProductRequest);

// module.exports = router;

const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/adminCatalogController');
const { upload, processImages } = require('../middleware/multerConfig'); 

// --- HSN Master ---
router.post('/hsn-master', catalogController.addHsnCode);
router.get('/hsn-master', catalogController.getAllHsnForAdmin);
router.get('/hsn-master/active', catalogController.getActiveHsnOnly);
router.put('/hsn-master/:id', catalogController.updateHsnCode);
router.delete('/hsn-master/:id', catalogController.deleteHsnCode);

// --- Categories ---
router.get('/categories/permanent', catalogController.getPermanentCategories);
router.post("/categories", upload.single("image"), processImages, catalogController.createCategory);
router.get('/categories', catalogController.getCategories);
router.put('/categories/:id', upload.single('image'), processImages, catalogController.updateCategory);
router.delete('/categories/:id', catalogController.deleteCategory);

// --- Sub-Categories ---
router.post('/sub-categories', upload.single('image'), processImages, catalogController.createSubCategory);
router.get('/sub-categories/all', catalogController.getAllSubCategories); 
router.get('/sub-categories/:catId', catalogController.getSubsByCategory);
router.put('/sub-categories/:id', upload.single('image'), processImages, catalogController.updateSubCategory);
router.delete('/sub-categories/:id', catalogController.deleteSubCategory);

// --- Master Product List (Catalog) ---
// 🌟 Admin manual-ah pudhu variety add panna
router.post('/master-product/add', upload.single('image'), processImages, catalogController.addMasterProduct); 
router.get('/master-list/:subCatId', catalogController.getMasterListBySubCategory);
router.put('/master-product/:id', upload.single('image'), processImages, catalogController.updateMasterProduct);
router.delete('/master-product/:id', catalogController.deleteMasterProduct);
router.get('/master-products/all', catalogController.getAllMasterProducts);

// --- Tokens / Seller Requests (Variety Approval Flow) ---
// 1. Fetch pending requests
router.get('/tokens/pending', catalogController.getPendingProductTokens);

// 2. Mark as Approved (Simple state change)
router.put('/tokens/approve-token', catalogController.approveProductToken); 

// 3. Final Step: Add HSN + Official Variety Image & Activate
// 🌟 THE FIX: Inga Admin image upload panna logic sethuttaen
router.post('/tokens/add-to-master', upload.single('image'), processImages, catalogController.addApprovedToMaster);

// 4. Reject request
router.put('/tokens/reject', catalogController.rejectProductRequest);

// 5. Get All Tokens (Filter by status via Query Params: ?status=rejected)
router.get('/tokens/all', catalogController.getAllProductTokens);

module.exports = router;