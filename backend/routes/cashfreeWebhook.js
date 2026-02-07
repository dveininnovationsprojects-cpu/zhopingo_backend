const express = require("express");
const crypto = require("crypto");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

const router = express.Router();

router.post("/cashfree/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const body = JSON.stringify(req.body);

    const expected = crypto
      .createHmac("sha256", process.env.CF_WEBHOOK_SECRET)
      .update(body)
      .digest("base64");

    if (signature !== expected) {
      return res.sendStatus(401);
    }

    const { order_id, order_status } = req.body.data;

    const payment = await Payment.findOne({ cfOrderId: order_id });
    if (!payment) return res.sendStatus(200);

    if (order_status === "PAID") {
      payment.status = "SUCCESS";
      await payment.save();

      await Order.findByIdAndUpdate(payment.orderId, {
        status: "Placed"
      });
    }

    if (order_status === "FAILED") {
      payment.status = "FAILED";
      await payment.save();

      await Order.findByIdAndUpdate(payment.orderId, {
        status: "Failed"
      });
    }

    res.sendStatus(200);

  } catch (err) {
    res.sendStatus(500);
  }
});

module.exports = router;
