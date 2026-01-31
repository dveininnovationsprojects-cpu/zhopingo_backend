const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Customer WhatsApp Login Flow
router.post('/send-otp', authController.sendOTP);       // Step 1: Send via WhatsApp
router.post('/login-otp', authController.loginWithOTP); // Step 2: Verify

// Seller Flow
router.post('/seller/register', authController.registerSeller); 
router.post('/seller/login', authController.loginSeller);

// Profile (Protected)
router.get('/profile', protect, authController.getProfile);
router.put('/update-profile', protect, authController.updateProfile); // Added protect here
router.post('/logout', authController.logout);
router.put('/add-address/:userId', protect, authController.addUserAddress);

module.exports = router;