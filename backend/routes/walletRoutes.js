const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');


router.post('/admin-update', walletController.adminUpdateWallet);


router.post('/refund', walletController.refundToWallet);


router.get('/status/:userId', walletController.getWalletStatus);
router.post('/create-topup', walletController.createWalletTopupSession);
router.get('/verify-topup', walletController.verifyWalletTopup);

module.exports = router;