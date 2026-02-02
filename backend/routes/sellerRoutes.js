const express = require("express");
const router = express.Router();

const {
  registerSeller,
  loginSeller,
  logoutSeller
} = require("../controllers/sellerController");

/* Auth Routes */
router.post("/register", registerSeller);
router.post("/login", loginSeller);
router.post("/logout", logoutSeller);

module.exports = router;
