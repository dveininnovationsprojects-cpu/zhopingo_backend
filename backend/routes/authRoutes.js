const express = require('express');
const router = express.Router();

const {
  sendOTP,
  loginWithOTP,
  registerSeller,
  loginSeller,
  addUserAddress,
  logout
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

router.post('/send-otp', sendOTP);
router.post('/login-otp', loginWithOTP);



router.put('/add-address/:userId', protect, addUserAddress);
router.post('/logout', logout);

module.exports = router;
