const express = require('express');
const router = express.Router();


router.use('/auth', require('./authRoutes')); 
router.use('/products', require('./productRoutes'));
router.use('/orders', require('./orderRoutes'));
router.use('/reels', require('./reelRoutes'));
router.use('/seller', require('./sellerRoutes'));
router.use('/payments', require('./paymentRoutes'));

module.exports = router;