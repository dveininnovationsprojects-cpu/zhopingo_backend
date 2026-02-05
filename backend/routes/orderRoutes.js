const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create', protect, orderCtrl.createOrder);
router.get("/my/:userId", orderCtrl.getMyOrders);
router.put('/cancel/:orderId', protect, orderCtrl.cancelOrder);
router.put('/update-status/:orderId', protect, orderCtrl.updateOrderStatus);
router.get('/all', protect, orderCtrl.getOrders);

module.exports = router;