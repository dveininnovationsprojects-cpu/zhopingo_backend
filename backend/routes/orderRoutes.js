const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');


router.post('/create', protect, orderCtrl.createOrder); 
router.get("/my/:userId", protect, orderCtrl.getMyOrders); 
router.put('/cancel/:orderId', protect, orderCtrl.cancelOrder); 


router.get("/seller/:sellerId", protect, orderCtrl.getSellerOrders); 

router.get('/all', protect, orderCtrl.getOrders);

router.put('/update-status/:orderId', protect, orderCtrl.updateOrderStatus);

module.exports = router;