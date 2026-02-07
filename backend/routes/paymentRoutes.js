const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/create-session", paymentController.createPaymentSession);
router.post("/cashfree/webhook", paymentController.cashfreeWebhook);
router.get("/verify/:orderId", paymentController.verifyPayment);

module.exports = router;
