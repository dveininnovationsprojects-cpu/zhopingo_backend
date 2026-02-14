const express = require('express');
const router = express.Router();
const { 
  adminLogin, 
  getAllSellers, 
  verifySellerStatus, 
  uploadDeliveryRates ,
  getAllCustomers,
  toggleBrandStatus,
  blockReelByAdmin
} = require("../controllers/adminController"); 
const { protect } = require('../middleware/authMiddleware');


router.post("/login", adminLogin);


router.post('/bulk-upload-pincodes', uploadDeliveryRates);


router.get("/sellers", getAllSellers);
router.post("/verify-seller", verifySellerStatus);
router.get('/customers', getAllCustomers);
router.put("/sellers/toggle-brand/:id", toggleBrandStatus);
router.post('/block-reel', protect,blockReelByAdmin);

module.exports = router;