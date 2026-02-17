const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// ==========================================
// 🛒 CUSTOMER ROUTES
// ==========================================

// 1. Order create panna
router.post('/create', protect, orderCtrl.createOrder); 

// 2. User-oda ella order-sum paaka
router.get("/my/:userId", protect, orderCtrl.getMyOrders); 

// 3. Order-a cancel panna
router.put('/cancel/:orderId', protect, orderCtrl.cancelOrder); 

// 4. 🚀 NEW: Delhivery Live Tracking (AWB Number vachu track panna)
router.get('/track/:awb', protect, orderCtrl.trackDelhivery);

// 5. 🛠️ NEW: Bypass Payment (Testing-kaga direct-a Order-a "Placed" aaka)
// Idhai mobile app-la "Select Payment" apuram koopdunum
router.put('/bypass-pay/:orderId', protect, orderCtrl.bypassPaymentAndShip);


// ==========================================
// 🏪 SELLER ROUTES
// ==========================================

// Seller-ku vandha orders-a paaka
router.get("/seller/:sellerId", protect, orderCtrl.getSellerOrders); 


// ==========================================
// 🔑 ADMIN ROUTES
// ==========================================

// Ella orders-aiyum paaka (Admin Dashboard)
router.get('/all', protect, orderCtrl.getOrders);

// Order status-a update panna (Example: Shipped, Delivered)
router.put('/update-status/:orderId', protect, orderCtrl.updateOrderStatus);

module.exports = router;