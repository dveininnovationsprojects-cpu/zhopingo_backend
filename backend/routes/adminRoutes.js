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
const { protect } = require('../middleware/authMiddleware');

router.post("/login", adminController.adminLogin);

// Admin Profile Routes (Using Token ID)
router.get('/profile/:id', protect, adminController.getAdminProfile);
router.put('/update-profile/:id', protect, adminController.updateAdminProfile);
router.put('/change-password/:id', protect, adminController.changeAdminPassword);

// Sellers & Customers
router.get("/sellers", protect, adminController.getAllSellers);
router.get('/customers', protect, adminController.getAllCustomers);
router.post("/verify-seller", protect, adminController.verifySellerStatus);
router.put('/sellers/:id', protect, adminController.updateSellerStatus);
router.put("/sellers/toggle-brand/:id", protect, adminController.toggleBrandStatus);

// Delivery & Reels
router.post('/bulk-upload-pincodes', protect, adminController.uploadDeliveryRates);
router.post('/block-reel', protect, adminController.blockReelByAdmin);

module.exports = router;