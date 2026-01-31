const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/paymentController');


router.post('/create-session', paymentCtrl.createSession);

router.post('/verify', paymentCtrl.verifyPayment);

module.exports = router;