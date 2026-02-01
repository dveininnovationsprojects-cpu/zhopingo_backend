// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productCtrl = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/multerConfig'); 

// Public
router.get('/all', productCtrl.getAllProducts);
router.get('/detail/:id', productCtrl.getProductById);

// Seller Protected
router.post('/add', protect, upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'video', maxCount: 1 }
]), productCtrl.createProduct);

router.put('/update/:id', protect, productCtrl.updateProduct);
router.delete('/delete/:id', protect, productCtrl.deleteProduct);
router.get('/similar/:id', productCtrl.getSimilarProducts);

module.exports = router;