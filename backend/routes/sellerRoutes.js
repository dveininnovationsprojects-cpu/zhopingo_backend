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


router.get("/new-orders/:sellerId", sellerCtrl.getSellerNewOrders);


router.put("/update-order-status", sellerCtrl.updateSellerOrderStatus);

module.exports = router;