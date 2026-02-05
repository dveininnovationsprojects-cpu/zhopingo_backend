const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");

// 🔥 IMPORTANT: controller object-la iruka function names
router.post("/create-session", paymentController.createSession);
router.get("/verify/:orderId", paymentController.verifyPayment);

module.exports = router;
