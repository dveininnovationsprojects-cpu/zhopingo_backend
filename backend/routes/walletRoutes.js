const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

// 1. Get Wallet Balance and History
router.get('/status/:userId', protect, walletController.getWalletStatus);

// 2. Top-up Process (Cashfree Session)
router.post('/create-topup', protect, walletController.createWalletTopupSession);

// 🌟 THE FIX: topupId-ah path parameter-ah config pannittaen
router.get('/verify-topup/:topupId', walletController.verifyWalletTopup);

// 4. 🌟 Pay for Order using Wallet (New Endpoint)
router.post('/pay-using-wallet', protect, walletController.payUsingWallet);

// 5. Admin Adjustment
router.post('/admin-update', protect, walletController.adminUpdateWallet);

module.exports = router;