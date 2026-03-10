// const express = require("express");
// const router = express.Router();

// const paymentController = require("../controllers/paymentController");


// router.post("/create-session", paymentController.createSession);

// router.get("/verify/:orderId", paymentController.verifyPayment);

// router.get("/phonepe-return/:orderId", paymentController.phonepeReturn);


// router.post("/webhook", paymentController.webhook);

// router.get("/track/:awb", paymentController.trackOrder);

// module.exports = router;


const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");


router.post("/create-session", paymentController.createSession);


router.get("/verify/:orderId", paymentController.verifyPayment);


router.get("/phonepe-return/:orderId", paymentController.phonepeReturn);

router.post("/webhook", paymentController.webhook);


module.exports = router;