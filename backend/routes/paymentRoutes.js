const express = require("express");
const router = express.Router();
const controller = require("../controllers/paymentController");

router.post("/create-session", controller.createSession);
router.get("/cashfree-return", controller.cashfreeReturn);
router.get("/verify/:orderId", controller.verifyPayment);

module.exports = router;
