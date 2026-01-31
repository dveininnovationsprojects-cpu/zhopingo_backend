const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send-otp', authController.sendOTP);
router.post('/login-otp', authController.loginWithOTP);

router.post('/seller/register', authController.registerSeller);
router.post('/seller/login', authController.loginSeller);

router.get('/profile', protect, authController.getProfile);
router.put('/update-profile', protect, authController.updateProfile);
router.put('/add-address/:userId', protect, authController.addUserAddress);
router.post('/logout', authController.logout);

module.exports = router;
