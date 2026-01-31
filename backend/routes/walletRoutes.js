const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');


router.post('/admin-update', walletController.adminUpdateWallet);


router.post('/refund', walletController.refundToWallet);


router.get('/status/:userId', walletController.getWalletStatus);

module.exports = router;