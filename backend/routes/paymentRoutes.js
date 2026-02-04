const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/paymentController');


router.post('/create-session', paymentCtrl.createSession);

router.get('/verify', paymentCtrl.verifyPayment);

module.exports = router;