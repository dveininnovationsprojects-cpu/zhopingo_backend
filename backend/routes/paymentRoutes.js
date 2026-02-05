const express = require("express");
const router = express.Router();

const {
  createSession,
  getPaymentStatus,
  cashfreeWebhook
} = require("../controllers/paymentController");

router.post("/create-session", createSession);
router.get("/status/:orderId", getPaymentStatus);

// 🔥 CASHFREE WEBHOOK
router.post("/webhook", cashfreeWebhook);

module.exports = router;
