const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/paymentController');


router.post('/create-session', paymentCtrl.createSession);

router.get('/verify', paymentCtrl.verifyPayment);
router.get('/status/:orderId', paymentCtrl.getPaymentStatus);


module.exports = router;