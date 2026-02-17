const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// ==========================================
// 🛒 CUSTOMER ROUTES
// ==========================================

// Order create panna
router.post('/create', protect, orderCtrl.createOrder); 

// Customer order history
router.get("/my/:userId", protect, orderCtrl.getMyOrders); 

// Order cancel
router.put('/cancel/:orderId', protect, orderCtrl.cancelOrder); 

// Delhivery Tracking
router.get('/track/:awb', protect, orderCtrl.trackDelhivery);

// Payment Bypass - இங்கதான் AWB trigger ஆகும்
router.put('/bypass-pay/:orderId', protect, orderCtrl.bypassPaymentAndShip);


// ==========================================
// 🏪 SELLER ROUTES
// ==========================================

// Seller orders - இங்கதான் நீ தப்பு பண்ணிருக்க வாய்ப்பு இருக்கு
// உன் Controller-ல் 'getSellerOrders' இருக்கிறதா என்று உறுதி செய்து கொள்
// இல்லையென்றால் இதை தற்காலிகமாக கமெண்ட் செய்.
router.get("/seller/:sellerId", protect, orderCtrl.getSellerOrders); 


// ==========================================
// 🔑 ADMIN ROUTES
// ==========================================

// Ella orders-aiyum paaka
router.get('/all', protect, orderCtrl.getOrders);

// Status update
router.put('/update-status/:orderId', protect, orderCtrl.updateOrderStatus);

module.exports = router;