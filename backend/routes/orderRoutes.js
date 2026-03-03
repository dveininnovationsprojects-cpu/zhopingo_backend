const express = require('express');
const router = express.Router(); // 🌟 Error fix: router defined correctly
const orderCtrl = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// 1. Static route first (Route shadowing avoid panna)
router.get('/calculate-shipping', protect, orderCtrl.calculateLiveDeliveryRate);

// 2. Post route
router.post('/create', protect, orderCtrl.createOrder);

// 3. Dynamic and Fetching routes
router.get('/all', protect, orderCtrl.getOrders);
router.get('/my/:userId', protect, orderCtrl.getMyOrders);
router.get('/seller/:sellerId', protect, orderCtrl.getSellerOrders);

// 4. Update and Process routes
router.put('/update-status/:orderId', protect, orderCtrl.updateOrderStatus);
router.put('/bypass-pay/:orderId', protect, orderCtrl.bypassPaymentAndShip);
router.put('/cancel/:orderId', protect, orderCtrl.cancelOrder);

// 5. Tracking (Delhivery)
router.get('/track/:awb', protect, orderCtrl.trackDelhivery);

module.exports = router;