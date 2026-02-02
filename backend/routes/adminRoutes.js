const express = require('express');
const router = express.Router();
const { 
  adminLogin, 
  getAllSellers, 
  verifySellerStatus, 
  uploadDeliveryRates 
} = require("../controllers/adminController"); // 🌟 adminLogin சேர்க்கப்பட்டது

// அட்மின் லாகின்
router.post("/login", adminLogin);

// பின்கோடு அப்லோட்
router.post('/bulk-upload-pincodes', uploadDeliveryRates);

// செலர் மேலாண்மை
router.get("/sellers", getAllSellers);
router.post("/verify-seller", verifySellerStatus);

module.exports = router;