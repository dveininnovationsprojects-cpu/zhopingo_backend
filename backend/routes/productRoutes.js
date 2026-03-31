// // const express = require('express');
// // const router = express.Router();
// // const productCtrl = require('../controllers/productController');
// // const { protect } = require('../middleware/authMiddleware');
// // const upload = require('../middleware/multerConfig'); 

// // // Public Routes (Customer App)
// // router.get('/all', productCtrl.getAllProducts);
// // router.get('/detail/:id', productCtrl.getProductById);
// // router.get('/similar/:id', productCtrl.getSimilarProducts);

// // // Protected Routes (Seller Dashboard)
// // router.get('/my-products', protect, productCtrl.getMyProducts);
// // router.post('/add', protect, upload.fields([
// //     { name: 'images', maxCount: 5 },
// //     { name: 'video', maxCount: 1 }
// // ]), productCtrl.createProduct);

// // router.put('/update/:id', protect, productCtrl.updateProduct);
// // router.delete('/delete/:id', protect, productCtrl.deleteProduct);

// // // User Interaction
// // router.post('/rate/:id', protect, productCtrl.rateProduct);

// // module.exports = router;


// // const express = require('express');
// // const router = express.Router();
// // const productCtrl = require('../controllers/productController');
// // const { protect } = require('../middleware/authMiddleware');
// // const { upload, processImages } = require('../middleware/multerConfig');

// // // 🔓 பொதுவான ரூட்கள் (Customer)
// // router.get('/all', productCtrl.getAllProducts);
// // router.get('/detail/:id', productCtrl.getProductById);

// // // 🔒 பாதுகாக்கப்பட்ட ரூட்கள் (Seller)
// // router.get('/my-products', protect, productCtrl.getMyProducts);

// // // 🌟 மல்டிபிள் இமேஜ் அப்லோடு வசதியுடன் கூடிய ஆட் ரூட்
// // router.post('/add', protect, upload.fields([
// //     { name: 'images', maxCount: 5 },
// //     { name: 'video', maxCount: 1 }
// // ]), productCtrl.createProduct);

// // router.put('/update/:id', protect, productCtrl.updateProduct);
// // router.delete('/delete/:id', protect, productCtrl.deleteProduct);
// // // router.get('/similar/:id', productCtrl.getSimilarProducts);

// // module.exports = router;




// const express = require('express');
// const router = express.Router();
// const productCtrl = require('../controllers/productController');
// const { protect } = require('../middleware/authMiddleware');

// // 🌟 UPDATE THIS IMPORT: Use curly braces to get both upload and processImages
// const { upload, processImages } = require('../middleware/multerConfig'); 

// router.get('/all', productCtrl.getAllProducts);
// router.get('/detail/:id', productCtrl.getProductById);
// router.get('/my-products', protect, productCtrl.getMyProducts);

// // 🌟 UPDATE THIS ROUTE: Add processImages after upload.fields
// router.post('/add', protect, upload.fields([
//     { name: 'images', maxCount: 5 },
//     { name: 'video', maxCount: 1 }
// ]), processImages, productCtrl.createProduct); // 🌟 Added processImages here

// router.put('/update/:id', protect, productCtrl.updateProduct);
// router.delete('/delete/:id', protect, productCtrl.deleteProduct);
// // router.post('/rate/:id', protect, productCtrl.rateProduct);
// router.get('/similar/:id', productCtrl.getSimilarProducts);

// module.exports = router;

const express = require('express');
const router = express.Router();
const productCtrl = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { upload, processImages } = require('../middleware/multerConfig'); 

// 🔓 Public Routes (Customer App)
router.get('/all', productCtrl.getAllProducts);
router.get('/detail/:id', productCtrl.getProductById);
router.get('/similar/:id', productCtrl.getSimilarProducts);

// 🔒 Protected Routes (Seller Dashboard)
router.get('/my-products', protect, productCtrl.getMyProducts);

// 🌟 THE DROP-DOWN FLOW ROUTE:
// Intha single route seller dropdown-la master list select pannalum work aagum, 
// illana images upload panni manual-ah token rise pannalum work aagum.
router.post('/add', protect, upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'video', maxCount: 1 }
]), processImages, productCtrl.createProduct);

// 🌟 NEW ENDPOINTS FOR DROPDOWN FLOW:
// 1. Seller dropdown-la paarka product list fetch panna (Basmati Rice, Ponni Rice etc.)
router.get('/master-list/:subCatId', productCtrl.getMasterListBySubCategory);

// 2. Seller token (Missing product request) rise panna logic
router.post('/request-token', protect, productCtrl.requestNewProduct);

router.put('/update/:id', 
    protect,
    upload.fields([
        { name: 'images', maxCount: 5 },
        { name: 'video', maxCount: 1 }
    ]),
    processImages,
    productCtrl.updateProduct
);
router.put(
    '/toggle-status/:id', 
    protect, 
    productCtrl.toggleProductStatus
);

router.delete('/delete/:id', protect, productCtrl.deleteProduct);

module.exports = router;