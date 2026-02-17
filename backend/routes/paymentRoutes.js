const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// 💳 1. Create Payment Session
// மொபைல் ஆப்-ல இருந்து "Pay Now" குடுத்தா இது PhonePe URL-ஐ தரும்
router.post('/create-session', protect, paymentCtrl.createSession);

// ✅ 2. Verify Payment
// பேமெண்ட் முடிஞ்சதும் இத கூப்டா ஆர்டர் "Placed" ஆகி டெல்லிவரி AWB ஜெனரேட் ஆகும்
router.get('/verify/:orderId', protect, paymentCtrl.verifyPayment);

// 🛰️ 3. Track Order
// டெல்லிவரி லைவ் ஸ்டேட்டஸ் பாக்க
router.get('/track/:awb', protect, paymentCtrl.trackOrder);

// 🔄 4. PhonePe Return URL
// பேமெண்ட் முடிஞ்சதும் கஸ்டமரை ஆப்புக்கு திருப்பி அனுப்ப (Redirect)
router.post('/phonepe-return/:orderId', paymentCtrl.phonepeReturn);

// ⚓ 5. Webhook
// PhonePe சர்வர்ல இருந்து பேக்-எண்டிற்கு நேரடித் தகவல் வர
router.post('/webhook', paymentCtrl.webhook);

module.exports = router;