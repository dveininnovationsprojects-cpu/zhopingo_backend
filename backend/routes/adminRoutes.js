const express = require('express');
const router = express.Router();
const { 
  adminLogin, 
  getAllSellers, 
  verifySellerStatus, 
  uploadDeliveryRates ,
  getAllCustomers,
  toggleBrandStatus,
  blockReelByAdmin,
  updateSellerStatus,
  getAdminProfile,
  changeAdminPassword,
  updateAdminProfile

} = require("../controllers/adminController"); 
const { protect } = require('../middleware/authMiddleware');


router.post("/login", adminLogin);


router.post('/bulk-upload-pincodes', uploadDeliveryRates);


router.get("/sellers", getAllSellers);
router.post("/verify-seller", verifySellerStatus);
router.get('/customers', getAllCustomers);
router.put("/sellers/toggle-brand/:id", toggleBrandStatus);
router.post('/block-reel', protect,blockReelByAdmin);
router.put('/sellers/:id', protect,updateSellerStatus);
// Admin Profile Routes
router.get('/profile/:id',protect, getAdminProfile);
router.put('/update-profile/:id',protect, updateAdminProfile);
router.put('/change-password/:id', protect,changeAdminPassword);

module.exports = router;