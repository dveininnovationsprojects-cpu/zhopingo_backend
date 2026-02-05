const router = require("express").Router();
const {
  createSession,
  checkPaymentStatus
} = require("../controllers/paymentController");

router.post("/create-session", createSession);
router.get("/status/:orderId", checkPaymentStatus);

module.exports = router;
