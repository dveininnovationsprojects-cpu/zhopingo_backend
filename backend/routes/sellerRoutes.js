const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload"); 
const sellerCtrl = require("../controllers/sellerController");


router.post("/register", sellerCtrl.registerSeller);
router.post("/login", sellerCtrl.loginSeller);

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
 
module.exports = router;