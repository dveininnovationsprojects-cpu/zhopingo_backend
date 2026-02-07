const axios = require("axios");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

const CF_BASE_URL = "https://sandbox.cashfree.com/pg";

exports.createSession = async (req, res) => {
  try {
    const { orderId, amount, customerId, customerPhone, customerName } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const cfOrderId = `ORD_${orderId}_${Date.now()}`;

    const response = await axios.post(
      `${CF_BASE_URL}/orders`,
      {
        order_id: cfOrderId,
        order_amount: Number(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: String(customerId),
          customer_phone: String(customerPhone),
          customer_name: customerName || "Customer"
        },
       order_meta: {
  return_url: `https://zhopingo.in/api/payment/cashfree-return?cf_order_id=${cfOrderId}`
}

      },
      {
        headers: {
          "x-client-id": process.env.CF_APP_ID,
          "x-client-secret": process.env.CF_SECRET,
          "x-api-version": "2025-01-01",
          "Content-Type": "application/json"
        }
      }
    );

    await Payment.create({
      orderId,
      transactionId: cfOrderId,
      amount,
      status: "PENDING"
    });

    res.json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      cfOrderId
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🔁 Return URL Handler (MOST IMPORTANT)
exports.cashfreeReturn = async (req, res) => {
  try {
    const { cf_order_id } = req.query;

    const response = await axios.get(
      `${CF_BASE_URL}/orders/${cf_order_id}`,
      {
        headers: {
          "x-client-id": process.env.CF_APP_ID,
          "x-client-secret": process.env.CF_SECRET,
          "x-api-version": "2025-01-01"
        }
      }
    );

    if (response.data.order_status === "PAID") {
      const payment = await Payment.findOne({ transactionId: cf_order_id });
      if (payment) {
        payment.status = "SUCCESS";
        payment.rawResponse = response.data;
        await payment.save();

        await Order.findByIdAndUpdate(payment.orderId, { status: "Placed" });
      }
      return res.redirect("zhopingo://order-success");
    }

    res.redirect("zhopingo://order-failed");
  } catch (err) {
    console.error(err.message);
    res.redirect("zhopingo://order-failed");
  }
};

// Optional manual verify
exports.verifyPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) return res.json({ success: true, status: "Pending" });

    if (payment.status === "SUCCESS") {
      return res.json({ success: true, status: "Placed" });
    }

    res.json({ success: true, status: "Pending" });
  } catch {
    res.status(500).json({ success: false });
  }
};
