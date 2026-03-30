

// const express = require('express');
// const router = express.Router();
// const orderCtrl = require('../controllers/orderController');
// const { protect } = require('../middleware/authMiddleware');


// router.post('/calculate-shipping', protect, orderCtrl.calculateLiveDeliveryRate);


// router.post('/create', protect, orderCtrl.createOrder);


// router.put('/cancel/:orderId', protect, orderCtrl.cancelOrder);


// router.get('/my/:userId', protect, orderCtrl.getMyOrders);


// router.post('/request-return', protect, orderCtrl.requestReturn);


// router.get('/seller/:sellerId', protect, orderCtrl.getSellerOrders);


// router.get('/track/:awb', protect, orderCtrl.trackDelhivery);


// router.post('/webhook/delhivery', orderCtrl.handleDelhiveryWebhook);


// router.get('/all', protect, orderCtrl.getOrders);
// router.get('/seller/returns/:sellerId', protect, orderCtrl.getSellerReturnRequests);

// router.put('/update-status/:orderId', protect, orderCtrl.updateOrderStatus);


// router.put('/bypass-pay/:orderId', protect, orderCtrl.bypassPaymentAndShip);




// module.exports = router;
const express = require('express');
const router = express.Router();
const orderCtrl = require('../controllers/orderController'); // Name correct-ah irukanum
const { protect } = require('../middleware/authMiddleware');

// 🛒 CUSTOMER FLOW
router.post('/create', protect, orderCtrl.createOrder);
router.get('/my/:userId', protect, orderCtrl.getMyOrders);
router.post('/request-return', protect, orderCtrl.requestReturn);

// 🏪 SELLER FLOW
router.get('/seller/:sellerId', protect, orderCtrl.getSellerOrders);
router.get('/seller/returns/:sellerId', protect, orderCtrl.getSellerReturnRequests);

// 🛡️ ADMIN & SETTLEMENTS
router.get('/all', protect, orderCtrl.getOrders);
router.put('/update-status/:orderId', protect, orderCtrl.updateOrderStatus);
router.put('/cancel/:orderId', protect, orderCtrl.cancelOrder);



// 🛠️ DEV TOOLS
router.put('/bypass-pay/:orderId', protect, orderCtrl.bypassPaymentAndShip);

module.exports = router;