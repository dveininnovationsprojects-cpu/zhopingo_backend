const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

/**
 * @route   POST /api/v1/payments/create-session
 * @desc    Cashfree பேமெண்ட் செஷனை உருவாக்கும் (SDK-க்கு அவசியம்)
 * @access  Private
 */
router.post("/create-session", protect, paymentController.createSession);

/**
 * @route   GET /api/v1/payments/cashfree-return
 * @desc    பேமெண்ட் முடிந்ததும் Web/SDK திரும்பும் இடம்
 * @access  Public
 */
router.get("/cashfree-return", paymentController.cashfreeReturn);

/**
 * @route   GET /api/v1/payments/verify/:orderId
 * @desc    ஆர்டர் ஐடியை வைத்து பேமெண்ட் நிலையைச் சரிபார்க்கும்
 * @access  Private
 */
router.get("/verify/:orderId", protect, paymentController.verifyPayment);

module.exports = router;