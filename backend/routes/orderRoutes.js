const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');


router.post('/create', protect, orderCtrl.createOrder);


router.get('/all', protect, orderCtrl.getOrders);
router.get('/my/:userId', protect, orderCtrl.getMyOrders);
router.get('/seller/:sellerId', protect, orderCtrl.getSellerOrders);

router.put('/update-status/:orderId', protect, orderCtrl.updateOrderStatus);
router.put('/bypass-pay/:orderId', protect, orderCtrl.bypassPaymentAndShip);
router.put('/cancel/:orderId', protect, orderCtrl.cancelOrder);

module.exports = router;