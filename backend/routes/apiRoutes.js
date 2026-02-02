const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes')); 
router.use('/wallet', require('./walletRoutes'));
router.use('/catalog', require('./catalogRoutes')); 
router.use('/payments', require('./paymentRoutes'));

router.use('/products', require('./productRoutes'));
router.use('/orders', require('./orderRoutes'));
router.use('/reels', require('./reelRoutes'));


router.use('/seller', require('./sellerRoutes')); 
router.use('/admin', require('./adminRoutes'));   

module.exports = router;