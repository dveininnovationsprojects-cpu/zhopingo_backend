const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// 1. Create Session - Ippo idhu dummy session create pannum
router.post('/create-session', protect, paymentCtrl.createSession);

// 2. Verify Payment - Idhu dhaan ippo MAIN. 
// Idhai mobile app-la irundhu koopta odane Order "Placed" aagum + Delhivery AWB generate aagum.
router.get('/verify/:orderId', protect, paymentCtrl.verifyPayment);

// 3. Track Order - Delhivery-oda live status paaka
router.get('/track/:awb', protect, paymentCtrl.trackOrder);

// 4. Cashfree Return & Webhook - Ippo idhu dummy-a thaan irukum, errors varaama irukka mattum
router.get('/cashfree-return', paymentCtrl.cashfreeReturn);
router.post('/webhook', paymentCtrl.webhook);

module.exports = router;