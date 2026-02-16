const axios = require("axios");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

const CF_BASE_URL = "https://sandbox.cashfree.com/pg";

// 1. CREATE PAYMENT SESSION
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
          customer_phone: String(customerPhone).slice(-10),
          customer_name: customerName || "Customer"
        },
        order_meta: {
          return_url: `https://api.zhopingo.in/api/v1/payments/cashfree-return?cf_order_id=${cfOrderId}`
        }
      },
      {
        headers: {
          "x-client-id": process.env.CF_APP_ID,
          "x-client-secret": process.env.CF_SECRET,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json"
        }
      }
    );

    await Payment.create({
      orderId,
      transactionId: cfOrderId,
      amount: Number(amount),
      status: "PENDING"
    });

    res.json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      cfOrderId
    });
  } catch (err) {
    console.error("Session Error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// 2. CASHFREE RETURN HANDLER
exports.cashfreeReturn = async (req, res) => {
  try {
    const { cf_order_id } = req.query;
    const response = await axios.get(`${CF_BASE_URL}/orders/${cf_order_id}`, {
      headers: {
        "x-client-id": process.env.CF_APP_ID,
        "x-client-secret": process.env.CF_SECRET,
        "x-api-version": "2023-08-01"
      }
    });

    if (response.data.order_status === "PAID") {
      const payment = await Payment.findOne({ transactionId: cf_order_id });
      if (payment) {
        payment.status = "SUCCESS";
        await payment.save();
        await Order.findByIdAndUpdate(payment.orderId, { status: "Placed", paymentStatus: "Paid" });
      }
      return res.redirect("zhopingo://order-success");
    }
    res.redirect("zhopingo://order-failed");
  } catch (err) {
    res.redirect("zhopingo://order-failed");
  }
};

// 3. 🔔 WEBHOOK HANDLER (CRITICAL)
exports.webhook = async (req, res) => {
  try {
    console.log("🔔 Webhook Received from Cashfree");
    
    // Cashfree அனுப்பும் Raw Body-யை JSON-ஆக மாற்றுகிறோம்
    const rawBody = req.body.toString();
    const payload = JSON.parse(rawBody);
    
    const cfOrderId = payload.data?.order?.order_id;
    const paymentStatus = payload.data?.payment?.payment_status;

    if (paymentStatus === "SUCCESS") {
      const payment = await Payment.findOne({ transactionId: cfOrderId });
      if (payment && payment.status !== "SUCCESS") {
        payment.status = "SUCCESS";
        await payment.save();
        await Order.findByIdAndUpdate(payment.orderId, { status: "Placed", paymentStatus: "Paid" });
        console.log("✅ Webhook: Order Updated Successfully");
      }
    }

    // 🎯 Cashfree-க்கு பதில் அனுப்புதல் (கட்டாயம்)
    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    // எர்ரர் வந்தாலும் Cashfree-க்கு 200 அனுப்புவது நல்லது (Retry-யை தவிர்க்க)
    res.status(200).send("Error Received");
  }
};

// 4. MANUAL VERIFY
exports.verifyPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) return res.json({ success: false, status: "Pending" });
    res.json({ success: true, status: payment.status === "SUCCESS" ? "Paid" : "Pending" });
  } catch {
    res.status(500).json({ success: false });
  }
};