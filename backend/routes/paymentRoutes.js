const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');


router.post('/create-session', protect, paymentCtrl.createSession);

router.get('/verify/:orderId', protect, paymentCtrl.verifyPayment);


router.get('/track/:awb', protect, paymentCtrl.trackOrder);


router.post('/phonepe-return/:orderId', paymentCtrl.phonepeReturn);


router.post('/webhook', paymentCtrl.webhook);

module.exports = router;