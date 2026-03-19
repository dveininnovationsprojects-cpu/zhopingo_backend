const express = require("express");
const router = express.Router();
const { upload } = require("../middleware/multerConfig"); 
const sellerCtrl = require("../controllers/sellerController");
const { protectSeller } = require("../middleware/authMiddleware"); 


router.post("/register", sellerCtrl.registerSeller);


router.post("/login", sellerCtrl.loginSeller);


router.post("/logout", sellerCtrl.logoutSeller);



router.post(
  "/kyc",
  upload.fields([
    { name: "pan_doc", maxCount: 1 },
    { name: "gst_doc", maxCount: 1 },
    { name: "fssai_doc", maxCount: 1 },
    { name: "msme_doc", maxCount: 1 }
  ]),
  sellerCtrl.uploadKyc
);




router.get("/dashboard/:id", sellerCtrl.getSellerDashboard);
router.put("/add-address/:id", sellerCtrl.addSellerAddress);

router.get("/new-orders/:sellerId", sellerCtrl.getSellerNewOrders);


router.put("/update-order-status", sellerCtrl.updateSellerOrderStatus);

// 🌟 Update/Toggle logic for Admin (Brand & Active Status)
router.put('/update-admin-status/:sellerId', protect, sellerCtrl.updateSellerAdminStatus);
router.put("/update-profile/:id", upload.single("profileImage"), sellerCtrl.updateSellerProfile);
// URL: /api/v1/sellers/toggle-brand/:sellerId
router.put('/toggle-brand/:sellerId', protect, sellerCtrl.toggleSellerBrandStatus);
router.get("/brands/all", sellerCtrl.getAllBrands);
router.get("/products/:sellerId", sellerCtrl.getProductsBySeller);

module.exports = router;