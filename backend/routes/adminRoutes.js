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
const { 
    adminLogin, 
    getAllSellers, 
    verifySellerStatus, 
    uploadDeliveryRates,
    getAllCustomers,
    toggleBrandStatus,
    blockReelByAdmin,
    updateSellerStatus,
    getAdminProfile,
    changeAdminPassword,
    updateAdminProfile,
    // 🌟 FINANCE & SETTLEMENT FUNCTIONS (Missing and Now Linked)
    getFinanceSettings,
    updateFinanceSettings,
    generateWeeklySettlement,
    markSettlementAsPaid,
    manageWeightSlabs,
    upsertWeightSlab,
    deleteWeightSlab
} = require("../controllers/adminController"); 
const { protect } = require('../middleware/authMiddleware');

// 🔐 AUTH
router.post("/login", adminLogin);

// 📍 LOGISTICS (Bulk Upload)
router.post('/bulk-upload-pincodes', uploadDeliveryRates);

// 👥 USER & SELLER MANAGEMENT
router.get("/sellers", protect, getAllSellers);
router.post("/verify-seller", protect, verifySellerStatus);
router.get('/customers', protect, getAllCustomers);
router.put("/sellers/toggle-brand/:id", protect, toggleBrandStatus);
router.put('/sellers/:id', protect, updateSellerStatus);

// 💰 FINANCE & SETTINGS (🌟 Linked Here)
router.get('/finance-settings', protect, getFinanceSettings);
router.put('/finance-settings', protect, updateFinanceSettings);

// 💸 WEEKLY SETTLEMENTS (🌟 Linked Here)
router.post('/generate-settlement', protect, generateWeeklySettlement);
router.put('/mark-settlement-paid/:id', protect, markSettlementAsPaid);

// ⚖️ WEIGHT SLABS (🌟 Linked Here)
router.get('/weight-slabs', protect, manageWeightSlabs);
router.post('/weight-slabs', protect, upsertWeightSlab);
router.delete('/weight-slabs/:id', protect, deleteWeightSlab);

// 🚫 CONTENT
router.post('/block-reel', protect, blockReelByAdmin);

// 👤 ADMIN PROFILE
router.get('/profile/:id', protect, getAdminProfile);
router.put('/update-profile/:id', protect, updateAdminProfile);
router.put('/change-password/:id', protect, changeAdminPassword);

module.exports = router;