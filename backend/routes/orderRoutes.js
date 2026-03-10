// const express = require('express');
// const router = express.Router(); // 🌟 Error fix: router defined correctly
// const orderCtrl = require('../controllers/orderController');
// const { protect } = require('../middleware/authMiddleware');

// // 1. Static route first (Route shadowing avoid panna)
// router.get('/calculate-shipping', protect, orderCtrl.calculateLiveDeliveryRate);

// // 2. Post route
// router.post('/create', protect, orderCtrl.createOrder);

// // 3. Dynamic and Fetching routes
// router.get('/all', protect, orderCtrl.getOrders);
// router.get('/my/:userId', protect, orderCtrl.getMyOrders);
// router.get('/seller/:sellerId', protect, orderCtrl.getSellerOrders);

// // 4. Update and Process routes
// router.put('/update-status/:orderId', protect, orderCtrl.updateOrderStatus);
// router.put('/bypass-pay/:orderId', protect, orderCtrl.bypassPaymentAndShip);
// router.put('/cancel/:orderId', protect, orderCtrl.cancelOrder);

// // 5. Tracking (Delhivery)
// router.get('/track/:awb', protect, orderCtrl.trackDelhivery);
// router.post('/webhook/delhivery', orderCtrl.handleDelhiveryWebhook);

// module.exports = router;


const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware'); // 🌟 Admin role protection added

/* =====================================================
    🚚 SHIPPING & LIVE RATES (Public/Protected)
===================================================== */
// Frontend live rate calculation (Weight & Unit sync)
router.get('/calculate-shipping', protect, orderCtrl.calculateLiveDeliveryRate);

/* =====================================================
    🛒 ORDER MANAGEMENT
===================================================== */
// Create new order (Universal weight sync + multi-seller split)
router.post('/create', protect, orderCtrl.createOrder);

// User Specific Orders
router.get('/my/:userId', protect, orderCtrl.getMyOrders);

// Seller Specific Orders
router.get('/seller/:sellerId', protect, orderCtrl.getSellerOrders);

/* =====================================================
    📈 TRACKING & WEBHOOKS
===================================================== */
// Live Delhivery tracking
router.get('/track/:awb', protect, orderCtrl.trackDelhivery);

// Delhivery Auto-status Sync (No 'protect' here as Delhivery calls this)
router.post('/webhook/delhivery', orderCtrl.handleDelhiveryWebhook);

/* =====================================================
    🛠️ ADMIN & PROCESSING ROUTES
===================================================== */
// Get all orders (Admin view)
router.get('/all', protect, admin, orderCtrl.getOrders);

// Finance & Status Updates
router.put('/update-status/:orderId', protect, orderCtrl.updateOrderStatus);
router.put('/bypass-pay/:orderId', protect, orderCtrl.bypassPaymentAndShip);
router.put('/cancel/:orderId', protect, orderCtrl.cancelOrder);

module.exports = router;