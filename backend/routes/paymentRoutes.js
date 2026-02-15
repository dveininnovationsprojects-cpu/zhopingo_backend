const express = require("express");
const router = express.Router();
const controller = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware"); 


router.post("/create-session", protect, controller.createSession);

router.get("/cashfree-return", controller.cashfreeReturn);

router.get("/verify/:orderId", protect, controller.verifyPayment);

module.exports = router;