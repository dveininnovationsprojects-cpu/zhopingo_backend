// const express = require('express');
// const router = express.Router();
// const { 
//   adminLogin, 
//   getAllSellers, 
//   verifySellerStatus, 
//   uploadDeliveryRates ,
//   getAllCustomers,
//   toggleBrandStatus,
//   blockReelByAdmin,
//   updateSellerStatus,
//   getAdminProfile,
//   changeAdminPassword,
//   updateAdminProfile

// } = require("../controllers/adminController"); 
// const { protect } = require('../middleware/authMiddleware');


// router.post("/login", adminLogin);


// router.post('/bulk-upload-pincodes', uploadDeliveryRates);


// router.get("/sellers", getAllSellers);
// router.post("/verify-seller", verifySellerStatus);
// router.get('/customers', getAllCustomers);
// router.put("/sellers/toggle-brand/:id", toggleBrandStatus);
// router.post('/block-reel', protect,blockReelByAdmin);
// router.put('/sellers/:id', protect,updateSellerStatus);
// // Admin Profile Routes
// router.get('/profile/:id',protect, getAdminProfile);
// router.put('/update-profile/:id',protect, updateAdminProfile);
// router.put('/change-password/:id', protect,changeAdminPassword);

// module.exports = router;
const express = require('express');
const router = express.Router();
const adminController = require("../controllers/adminController"); 
const { protectAdmin } = require('../middleware/authMiddleware'); // 🌟 இத மட்டும் மாத்து

router.post("/login", adminController.adminLogin);

// இங்க எல்லா இடத்துலயும் 'protectAdmin' பயன்படுத்து
router.get('/profile/:id', protectAdmin, adminController.getAdminProfile);
router.put('/update-profile/:id', protectAdmin, adminController.updateAdminProfile);
router.put('/change-password/:id', protectAdmin, adminController.changeAdminPassword);

// மத்த அட்மின் வேலைகளுக்கும் இதையே போடு
router.get("/sellers", protectAdmin, adminController.getAllSellers);
router.get('/customers', protectAdmin, adminController.getAllCustomers);
router.post("/verify-seller", protectAdmin, adminController.verifySellerStatus);
router.put('/sellers/:id', protectAdmin, adminController.updateSellerStatus);
router.put("/sellers/toggle-brand/:id", protectAdmin, adminController.toggleBrandStatus);

// Delivery & Reels
router.post('/bulk-upload-pincodes', protectAdmin, adminController.uploadDeliveryRates);
router.post('/block-reel', protectAdmin, adminController.blockReelByAdmin);

module.exports = router;