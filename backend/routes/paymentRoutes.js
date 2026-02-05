const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/create-session", paymentController.createSession);
router.get("/status/:orderId", paymentController.getPaymentStatus);

module.exports = router;
