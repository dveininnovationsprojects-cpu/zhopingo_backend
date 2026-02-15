const axios = require("axios");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

// .env-ல் இருந்து BASE_URL-ஐ எடுக்கிறோம் (ngrok அல்லது production url)
const MY_BASE_URL = process.env.BASE_URL || "https://liliana-exsufflicate-radioactively.ngrok-free.dev";
const CF_BASE_URL = process.env.NODE_ENV === "production" 
  ? "https://api.cashfree.com/pg" 
  : "https://sandbox.cashfree.com/pg";

// 🌟 1. Create Payment Session
exports.createSession = async (req, res) => {
  try {
    const { orderId, amount, customerId, customerPhone, customerName } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // 🌟 போன் நம்பர்: 10 இலக்க ஸ்ட்ரிங் ஆக இருக்க வேண்டும்
    const cleanPhone = String(customerPhone).replace(/\D/g, "").slice(-10);

    // 🌟 Cashfree Order ID: அதிக நீளம் இருக்கக்கூடாது (Max 45 chars)
    // format: CF_orderIdSuffix_timestampSuffix
    const cfOrderId = `CF_${orderId.toString().slice(-6)}_${Date.now().toString().slice(-6)}`;

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
          return_url: `${MY_BASE_URL}/api/v1/payment/cashfree-return?cf_order_id=${cfOrderId}`
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

    // Payment Record-ஐ PENDING நிலையில் உருவாக்குகிறோம்
    await Payment.create({
      orderId,
      transactionId: cfOrderId,
      amount: Number(amount),
      status: "PENDING"
    });

    res.json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      cfOrderId: response.data.order_id
    });

  } catch (err) {
    console.error("Backend Error:", err.response?.data || err.message);
    res.status(500).json({ 
      success: false, 
      message: "Could not create payment session",
      error: err.response?.data?.message || err.message 
    });
  }
};

// 🌟 2. Cashfree Return (Web Fallback / Manual Redirect)
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

        // ஆர்டர் ஸ்டேட்டஸை 'Placed' ஆக மாற்றுகிறோம்
        await Order.findByIdAndUpdate(payment.orderId, { 
            status: "Placed",
            paymentStatus: "Paid" 
        });
      }
      return res.redirect("zhopingo://payment-success");
    }

    res.redirect("zhopingo://payment-failed");
  } catch (err) {
    console.error("Return Error:", err.message);
    res.redirect("zhopingo://payment-failed");
  }
};

// 🌟 3. Verify Payment Status (Used by Frontend after SDK Callback)
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // சமீபத்திய பேமெண்ட் ரெக்கார்டை எடுக்கிறோம்
    const payment = await Payment.findOne({ orderId }).sort({ createdAt: -1 });
    
    if (!payment) {
      return res.json({ success: false, status: "No Record Found" });
    }

    // ஒருவேளை இன்னும் PENDING ஆக இருந்தால் Cashfree-ல் இருந்து நேரடி நிலையை சரிபார்க்கலாம்
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

    if (payment.status === "SUCCESS") {
      return res.json({ success: true, status: "Placed" });
    }

    res.json({ success: true, status: "Pending/Failed" });
  } catch (err) {
    console.error("Verify Error:", err.message);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};