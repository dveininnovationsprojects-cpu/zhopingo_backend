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
    getFinanceSettings,
    updateFinanceSettings,
    generateWeeklySettlement,
    markSettlementAsPaid,
    manageWeightSlabs,
    upsertWeightSlab,
    getAllSettlements,
    generateGlobalLogisticsSettlement,
    deleteWeightSlab,
    getSellerSettlements,
    getPendingDailyOrders,
    getSellerLedger,
    getSellerKycForAdmin,
    getAllLedgerEntries
} = require("../controllers/adminController"); 
const { protect } = require('../middleware/authMiddleware');


router.post("/login", adminLogin);


router.post('/bulk-upload-pincodes', uploadDeliveryRates);


router.get("/sellers", getAllSellers);
router.post("/verify-seller", verifySellerStatus);
router.get('/customers', getAllCustomers);
router.put("/sellers/toggle-brand/:id", toggleBrandStatus);
router.put('/sellers/:id', protect, updateSellerStatus);
router.get('/seller/:sellerId', getSellerSettlements);


router.get('/finance-settings', protect, getFinanceSettings);
router.put('/finance-settings', protect, updateFinanceSettings);
router.get('/finance/pending-orders/:sellerId', protect, getPendingDailyOrders);

router.post('/generate-settlement', protect, generateWeeklySettlement);
router.put('/mark-settlement-paid/:id', protect, markSettlementAsPaid);


router.get('/weight-slabs', protect, manageWeightSlabs);
router.post('/weight-slabs', protect, upsertWeightSlab);
router.delete('/weight-slabs/:id', protect, deleteWeightSlab);


router.post('/block-reel', protect, blockReelByAdmin);


router.get('/profile/:id', protect, getAdminProfile);
router.put('/update-profile/:id', protect, updateAdminProfile);
router.put('/change-password/:id', protect, changeAdminPassword);
router.get('/settlements/all', protect, getAllSettlements);
router.post('/logistics-settlement', protect, generateGlobalLogisticsSettlement);
// 🚀 41. New GET Routes for Auto-Sync (Add these in adminRoutes.js)
router.get('/finance/settlements/:sellerId', protect, getSellerSettlements); // Add this function in controller
router.get('/ledger/:sellerId', protect, getSellerLedger); // Add this function in controller
router.get("/seller-kyc/:sellerId", protect, getSellerKycForAdmin);


router.get('/ledger/all', protect, getAllLedgerEntries);

module.exports = router;