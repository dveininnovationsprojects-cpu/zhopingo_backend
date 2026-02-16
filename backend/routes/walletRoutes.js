const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');


router.get('/status/:userId', protect, walletController.getWalletStatus);
router.post('/create-topup', protect, walletController.createWalletTopupSession);
router.get('/verify-topup', walletController.verifyWalletTopup); // Cashfree Return URL


router.post('/admin-update', protect, walletController.adminUpdateWallet);

module.exports = router;