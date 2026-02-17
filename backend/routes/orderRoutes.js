const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   /api/v1/orders
 * @desc    Professional E-commerce Order Management (Blinkit Style)
 */

// ==========================================
// 🛒 CUSTOMER ROUTES (Mobile App)
// ==========================================

// 1. Initial-a Order create panna (Status: Pending)
router.post('/create', protect, orderCtrl.createOrder); 

// 2. Customer-oda total order history paaka
router.get("/my/:userId", protect, orderCtrl.getMyOrders); 

// 3. Customer order-a cancel panna (Auto-wallet refund logic included)
router.put('/cancel/:orderId', protect, orderCtrl.cancelOrder); 

// 4. 🚚 Real-time Delhivery Tracking (AWB vachu live status fetch pannum)
router.get('/track/:awb', protect, orderCtrl.trackDelhivery);

// 5. 🛠️ Payment Bypass - Idhu dhaan Payment Success-ah mimic panni Delhivery-a trigger pannum
// Status: Placed, Payment: Paid nu maarum.
router.put('/bypass-pay/:orderId', protect, orderCtrl.bypassPaymentAndShip);


// ==========================================
// 🏪 SELLER ROUTES (Seller Dashboard)
// ==========================================

// 6. Seller thandudaiya products ulla orders-a mattum paaka
router.get("/seller/:sellerId", protect, orderCtrl.getSellerOrders); 


// ==========================================
// 🔑 ADMIN & COMMON ROUTES (Admin Dashboard)
// ==========================================

// 7. System-la irukura ella orders-aiyum list panna (Admin only)
router.get('/all', protect, orderCtrl.getOrders);

// 8. Status update - Delivered nu mathum podhu Seller Payout trigger aagum
router.put('/update-status/:orderId', protect, orderCtrl.updateOrderStatus);

module.exports = router;