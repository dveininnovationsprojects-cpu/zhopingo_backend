const axios = require("axios");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

const CF_BASE_URL = "https://sandbox.cashfree.com/pg";
const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;
const CF_API_VERSION = "2023-08-01";

/* =====================================================
   1️⃣ CREATE PAYMENT SESSION (NO SUCCESS HERE ❌)
===================================================== */
exports.createSession = async (req, res) => {
  try {
    const {
      orderId,
      amount,
      customerId,
      customerPhone,
      customerName
    } = req.body;

    if (!CF_APP_ID || !CF_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Cashfree keys missing"
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // 🔹 Cashfree order id (must be UNIQUE)
    const cfOrderId = `CF_${orderId}_${Date.now()}`;

    // 🔹 Create Cashfree Order
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
        }
      },
      {
        headers: {
          "x-client-id": CF_APP_ID,
          "x-client-secret": CF_SECRET,
          "x-api-version": CF_API_VERSION,
          "Content-Type": "application/json"
        }
      }
    );

    // 🔹 Save as PENDING only
    await Payment.create({
      orderId,
      transactionId: cfOrderId,
      amount,
      status: "PENDING"
    });

    return res.json({
      success: true,
      cfOrderId,
      paymentSessionId: response.data.payment_session_id
    });

  } catch (err) {
    console.error("CREATE SESSION ERROR:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  }
};

/* =====================================================
   2️⃣ VERIFY PAYMENT (ONLY PLACE ORDER HERE ✅)
===================================================== */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // ✅ Already placed → return fast
    if (order.status === "Placed") {
      return res.json({
        success: true,
        status: "Placed"
      });
    }

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return res.json({
        success: true,
        status: "Pending"
      });
    }

    // 🔹 Ask Cashfree
    const response = await axios.get(
      `${CF_BASE_URL}/orders/${payment.transactionId}`,
      {
        headers: {
          "x-client-id": CF_APP_ID,
          "x-client-secret": CF_SECRET,
          "x-api-version": CF_API_VERSION
        }
      }
    );

    const cfStatus = response.data.order_status;

    // ✅ FINAL SUCCESS
    if (cfStatus === "PAID") {
      payment.status = "SUCCESS";
      await payment.save();

      order.status = "Placed";
      await order.save();

      return res.json({
        success: true,
        status: "Placed"
      });
    }

    // ⏳ Still waiting
    return res.json({
      success: true,
      status: "Pending"
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  }
};



// const axios = require("axios");
// const Order = require("../models/Order");
// const Payment = require("../models/Payment");

// // ✅ DO NOT CHANGE THIS URL
// const CASHFREE_END_POINT = "https://sandbox.cashfree.com/pg/orders";

// exports.createSession = async (req, res) => {
//   try {
//     const { orderId, amount, customerId, customerPhone, customerName } = req.body;

//     // Use local variables to ensure they are being read from .env correctly
//     const appId = process.env.CF_APP_ID;
//     const secretKey = process.env.CF_SECRET;

//     if (!appId || !secretKey) {
//       return res.status(500).json({ success: false, message: "Payment Keys Missing in .env" });
//     }

//     const cfOrderId = `ORD_${orderId}_${Date.now()}`;

//     // 🚀 THE POST CALL (Server-to-Server)
//     const response = await axios({
//       method: 'post',
//       url: CASHFREE_END_POINT,
//       headers: {
//         "x-client-id": appId,
//         "x-client-secret": secretKey,
//         "x-api-version": "2023-08-01",
//         "Content-Type": "application/json"
//       },
//       data: {
//         order_id: cfOrderId,
//         order_amount: parseFloat(amount),
//         order_currency: "INR",
//         customer_details: {
//           customer_id: String(customerId),
//           customer_phone: String(customerPhone),
//           customer_name: customerName || "Guest User"
//         }
//       }
//     });

//     await Payment.create({
//       orderId,
//       transactionId: cfOrderId,
//       amount,
//       status: "PENDING", 
//     });

//     // 🎯 Return the Session ID to the Mobile App
//     res.json({
//       success: true,
//       cfOrderId,
//       paymentSessionId: response.data.payment_session_id 
//     });

//   } catch (err) {
//     // 🔍 THIS WILL SHOW THE REAL ERROR IN YOUR VS CODE TERMINAL
//     const errorData = err.response?.data || err.message;
//     console.error("CASHFREE REJECTION:", errorData);
//     res.status(500).json({ success: false, error: errorData });
//   }
// };
// // controllers/paymentController.js

// exports.verifyPayment = async (req, res) => {
//   try {
//     const { orderId } = req.params; 

//     const payment = await Payment.findOne({ orderId: orderId });
//     if (!payment) return res.status(404).json({ success: false, message: "Record not found" });

//     const response = await axios.get(`${CASHFREE_END_POINT}/${payment.transactionId}`, {
//       headers: { 
//           "x-client-id": process.env.CF_APP_ID, 
//           "x-client-secret": process.env.CF_SECRET, 
//           "x-api-version": "2023-08-01" 
//       }
//     });

//     // Payment success aana Order status-ai mathanum
//     if (response.data.order_status === "PAID") {
//       await Order.findByIdAndUpdate(orderId, { status: "Placed" });
//       payment.status = "SUCCESS";
//       await payment.save();

//       return res.json({ success: true, status: "Placed", message: "Order Success!" });
//     }

//     res.json({ success: true, status: "Pending" });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };