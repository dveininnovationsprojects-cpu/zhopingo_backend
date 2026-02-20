const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");

// CREATE SESSION
router.post("/create-session", paymentController.createSession);

// VERIFY PAYMENT
router.get("/verify/:orderId", paymentController.verifyPayment);

// RETURN URL
router.get("/phonepe-return/:orderId", paymentController.phonepeReturn);

// WEBHOOK
router.post("/webhook", paymentController.webhook);

module.exports = router;