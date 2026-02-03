const express = require('express');
const router = express.Router();
const { 
  adminLogin, 
  getAllSellers, 
  verifySellerStatus, 
  uploadDeliveryRates 
} = require("../controllers/adminController"); 


router.post("/login", adminLogin);


router.post('/bulk-upload-pincodes', uploadDeliveryRates);


router.get("/sellers", getAllSellers);
router.post("/verify-seller", verifySellerStatus);

module.exports = router;