const axios = require("axios");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

// Environment settings
const CF_BASE_URL = process.env.NODE_ENV === "production" 
  ? "https://api.cashfree.com/pg" 
  : "https://sandbox.cashfree.com/pg";

const MY_BASE_URL = process.env.BASE_URL || "https://api.zhopingo.in";

/**
 * 🌟 1. CREATE PAYMENT SESSION
 */
exports.createSession = async (req, res) => {
  try {
    const { orderId, amount, customerId, customerPhone, customerName } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const cleanPhone = String(customerPhone).replace(/\D/g, "").slice(-10);
    const cfOrderId = `ORD_${orderId.toString().slice(-6)}_${Date.now()}`;

    const response = await axios.post(
      `${CF_BASE_URL}/orders`,
      {
        order_id: cfOrderId,
        order_amount: Number(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: String(customerId),
          customer_phone: cleanPhone, 
          customer_name: customerName || "Zhopingo User"
        },
        order_meta: {
          // 🔗 இதுதான் மிக முக்கியம்: பேமெண்ட் முடிஞ்சதும் இங்க தான் வரும்
          return_url: `${MY_BASE_URL}/api/v1/payments/cashfree-return?cf_order_id=${cfOrderId}`
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
      
    // res.status(200).json-க்கு ஒரு வரி முன்னாடி இதை போடு
     console.log("REAL_SESSION_ID_FROM_CASHFREE:", response.data.payment_session_id);

    return res.status(200).json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      cfOrderId: response.data.order_id
    });

  } catch (err) {
    console.error("Cashfree API Error:", err.response?.data || err.message);
    return res.status(500).json({ 
      success: false, 
      error: err.response?.data?.message || "Internal Server Error" 
    });
  }
};

/**
 * 🌟 2. CASHFREE RETURN (The Missing Logic)
 * பேமெண்ட் முடிஞ்சதும் பிரவுசர் அல்லது SDK வழியா இங்க தான் வரும்.
 */
exports.cashfreeReturn = async (req, res) => {
  try {
    const { cf_order_id } = req.query;

    // Cashfree-ல இருந்து அந்த ஆர்டரோட லேட்டஸ்ட் நிலையை எடுக்குறோம்
    const response = await axios.get(
      `${CF_BASE_URL}/orders/${cf_order_id}`,
      {
        headers: {
          "x-client-id": process.env.CF_APP_ID,
          "x-client-secret": process.env.CF_SECRET,
          "x-api-version": "2023-08-01"
        }
      }
    );

    if (response.data.order_status === "PAID") {
      const payment = await Payment.findOne({ transactionId: cf_order_id });
      
      if (payment && payment.status !== "SUCCESS") {
        payment.status = "SUCCESS";
        payment.rawResponse = response.data;
        await payment.save();

        // 🛍️ ஆர்டர் ஸ்டேட்டஸை மாத்துறோம்
        await Order.findByIdAndUpdate(payment.orderId, { 
            status: "Placed",
            paymentStatus: "Paid" 
        });
      }
      // 📱 மொபைல் ஆப்பிற்கு சக்சஸ் மெசேஜ் அனுப்புவோம் (Deep Link)
      return res.redirect("zhopingo://payment-success");
    }

    // தோல்வியுற்றால்
    return res.redirect("zhopingo://payment-failed");
  } catch (err) {
    console.error("Return Error:", err.message);
    return res.redirect("zhopingo://payment-failed");
  }
};
// verifyPayment பங்க்ஷனில் ஒரு சின்ன இம்ப்ரூவ்மென்ட்
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await Payment.findOne({ orderId }).sort({ createdAt: -1 });

    if (!payment) return res.status(404).json({ success: false, message: "No payment record found" });

    const response = await axios.get(
      `${CF_BASE_URL}/orders/${payment.transactionId}`,
      {
        headers: {
          "x-client-id": process.env.CF_APP_ID,
          "x-client-secret": process.env.CF_SECRET,
          "x-api-version": "2023-08-01"
        }
      }
    );

    // 🌟 டாக்குமெண்ட் படி PAID அல்லது ACTIVE ஸ்டேட்டஸை செக் பண்ணுவோம்
    if (response.data.order_status === "PAID") {
      payment.status = "SUCCESS";
      payment.rawResponse = response.data;
      await payment.save();
      
      await Order.findByIdAndUpdate(orderId, { status: "Placed", paymentStatus: "Paid" });
      return res.json({ success: true, status: "SUCCESS" });
    }

    return res.json({ success: false, status: response.data.order_status });
  } catch (err) {
    console.error("Verification Error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};