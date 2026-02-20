const express = require('express');
const router = express.Router();

const {
  sendOTP,
  loginWithOTP,
  registerSeller,
  loginSeller,
  updateProfile,
  addUserAddress,
  toggleWishlist,
  getWishlist,
  logout
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

router.post('/send-otp', sendOTP);
router.post('/login-otp', loginWithOTP);


router.post('/wishlist/toggle', protect, toggleWishlist);
router.get('/wishlist/all', protect, getWishlist);
router.put('/add-address/:userId', protect, addUserAddress);
router.put('/update-profile', protect, updateProfile);
router.post('/logout', logout);

module.exports = router;
