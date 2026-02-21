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
// அட்மின் ப்ரொபைல் - GET (பார்க்க), PUT (அப்டேட் செய்ய)
router.get('/profile', protect, getAdminProfile);
router.put('/profile', protect, updateAdminProfile);

// பாஸ்வேர்ட் மாற்ற - PUT
router.put('/change-password', protect, changeAdminPassword);

module.exports = router;