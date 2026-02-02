const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const {
  registerSeller,
  uploadKyc,
  loginSeller,
  logoutSeller
} = require("../controllers/sellerController");

/* -------- REGISTER (DETAILS + PASSWORD) -------- */
router.post("/register", registerSeller);

/* -------- LOGIN -------- */
router.post("/login", loginSeller);

/* -------- KYC UPLOAD (FILES ONLY) -------- */
router.post(
  "/kyc",
  upload.fields([
    { name: "pan_doc", maxCount: 1 },
    { name: "gst_doc", maxCount: 1 },
    { name: "fssai_doc", maxCount: 1 },
    { name: "msme_doc", maxCount: 1 }
  ]),
  uploadKyc
);

/* -------- LOGOUT -------- */
router.post("/logout", logoutSeller);

module.exports = router;
