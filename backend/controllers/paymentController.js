const axios = require("axios");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

// .env-ல் இருந்து BASE_URL-ஐ எடுக்கிறோம்
const MY_BASE_URL = process.env.BASE_URL || "https://api.zhopingo.in";
const CF_BASE_URL = process.env.NODE_ENV === "production" 
  ? "https://api.cashfree.com/pg" 
  : "https://sandbox.cashfree.com/pg";

// 🌟 1. Create Payment Session
exports.createSession = async (req, res) => {
  try {
    const { orderId, amount, customerId, customerPhone, customerName } = req.body;

    // ஆர்டர் இருக்கிறதா என்று சரிபார்
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // 🌟 போன் நம்பர் வேலிடேஷன்: 10 இலக்கங்கள் மட்டும்
    const cleanPhone = String(customerPhone).replace(/\D/g, "").slice(-10);

    // 🌟 Cashfree Order ID: தனித்துவமாகவும் (Unique) 45 எழுத்துக்களுக்குள்ளும் இருக்க வேண்டும்
    const cfOrderId = `ORD_${orderId.toString().slice(-6)}_${Date.now().toString().slice(-4)}`;

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
          // மொபைல் ஆப்பிற்கு திரும்ப வருவதற்கான URL
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

    // பேமெண்ட் ரெக்கார்டு உருவாக்குதல்
    await Payment.create({
      orderId,
      transactionId: cfOrderId,
      amount: Number(amount),
      status: "PENDING"
    });

    // ✅ கிரிஸ்டல் கிளியர் ரெஸ்பான்ஸ் (எந்த எக்ஸ்ட்ரா டெக்ஸ்டும் இருக்காது)
    return res.status(200).json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      cfOrderId: response.data.order_id
    });

  } catch (err) {
    console.error("Cashfree Session Error:", err.response?.data || err.message);
    return res.status(500).json({ 
      success: false, 
      message: "Could not create payment session",
      error: err.response?.data?.message || err.message 
    });
  }
};

// 🌟 2. Cashfree Return (Web Fallback)
exports.cashfreeReturn = async (req, res) => {
  try {
    const { cf_order_id } = req.query;

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

        await Order.findByIdAndUpdate(payment.orderId, { 
            status: "Placed",
            paymentStatus: "Paid" 
        });
      }
      return res.redirect("zhopingo://payment-success");
    }

    return res.redirect("zhopingo://payment-failed");
  } catch (err) {
    console.error("Return Error:", err.message);
    return res.redirect("zhopingo://payment-failed");
  }
};

// 🌟 3. Verify Payment Status
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await Payment.findOne({ orderId }).sort({ createdAt: -1 });
    
    if (!payment) return res.json({ success: false, status: "No Record Found" });

    if (payment.status === "PENDING") {
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
      
      if (response.data.order_status === "PAID") {
        payment.status = "SUCCESS";
        await payment.save();
        await Order.findByIdAndUpdate(orderId, { status: "Placed", paymentStatus: "Paid" });
        return res.json({ success: true, status: "Placed" });
      }
    }

    return res.json({ success: true, status: payment.status === "SUCCESS" ? "Placed" : "Pending/Failed" });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};