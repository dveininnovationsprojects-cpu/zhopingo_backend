// const axios = require("axios");
// const Order = require("../models/Order");
// const Payment = require("../models/Payment");

// /* ================= CASHFREE TEST CONFIG (HARDCODE) ================= */
// const CF_BASE = "https://sandbox.cashfree.com/pg";
// const CF_VERSION = "2023-08-01";

// const CF_APP_ID = process.env.CF_APP_ID;
// const CF_SECRET = process.env.CF_SECRET ;


// /* 🔥 NGROK URL – DIRECT */
// const BASE_URL = "https://liliana-exsufflicate-radioactively.ngrok-free.dev";

// /* =====================================================
//    1️⃣ CREATE PAYMENT SESSION
// ===================================================== */
// exports.createPaymentSession = async (req, res) => {
//   try {
//     const {
//       orderId,
//       amount,
//       customerId,
//       customerPhone,
//       customerName
//     } = req.body;

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }
// const cfOrderId = `CF_${orderId}_${Date.now()}`;

// const response = await axios.post(
//   "https://sandbox.cashfree.com/pg/orders",
//   {
//     order_id: cfOrderId,
//     order_amount: amount,
//     order_currency: "INR",
//     customer_details: {
//       customer_id: String(customerId),
//       customer_phone: String(customerPhone),
//       customer_name: customerName || "Customer"
//     }
//   },
//   {
//     headers: {
//       "x-client-id": process.env.CF_APP_ID,
//       "x-client-secret": process.env.CF_SECRET,
//       "x-api-version": "2023-08-01",
//       "Content-Type": "application/json"
//     }
//   }
// );

// // ✅ IMPORTANT FIX HERE
// await Payment.create({
//   orderId,
//   transactionId: cfOrderId,   // 🔥 THIS LINE FIXES EVERYTHING
//   amount,
//   status: "PENDING"
// });

// const rawSessionId = response.data.payment_session_id;

// const paymentSessionId = rawSessionId
//   ? rawSessionId.toString().trim()
//   : null;

// console.log("✅ CASHFREE SESSION ID:", paymentSessionId);

// res.json({
//   success: true,
//   paymentSessionId
// });

//   } catch (err) {
//     console.error("CASHFREE CREATE ERROR:", err.response?.data || err.message);
//     return res.status(500).json({
//       success: false,
//       error: err.response?.data || err.message
//     });
//   }
// };

// /* =====================================================
//    2️⃣ CASHFREE WEBHOOK (NO SECRET – TEST ONLY)
// ===================================================== */
// exports.cashfreeWebhook = async (req, res) => {
//   try {
//     console.log("🔥 WEBHOOK HIT:", req.body);

//     const { order_id, order_status } = req.body?.data || {};
//     if (!order_id) return res.sendStatus(200);

//     const payment = await Payment.findOne({ cfOrderId: order_id });
//     if (!payment) return res.sendStatus(200);

//     if (order_status === "PAID") {
//       payment.status = "SUCCESS";
//       await payment.save();

//       await Order.findByIdAndUpdate(payment.orderId, {
//         status: "Placed"
//       });
//     }

//     if (order_status === "FAILED") {
//       payment.status = "FAILED";
//       await payment.save();

//       await Order.findByIdAndUpdate(payment.orderId, {
//         status: "Failed"
//       });
//     }

//     return res.sendStatus(200);

//   } catch (err) {
//     console.error("WEBHOOK ERROR:", err.message);
//     return res.sendStatus(500);
//   }
// };

// /* =====================================================
//    3️⃣ VERIFY (SIMPLE STATUS)
// ===================================================== */
// exports.verifyPayment = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const order = await Order.findById(orderId);

//     if (!order) {
//       return res.status(404).json({ success: false });
//     }

//     return res.json({
//       success: true,
//       status: order.status
//     });

//   } catch (err) {
//     return res.status(500).json({ success: false });
//   }
// };



// // const axios = require("axios");
// // const Order = require("../models/Order");
// // const Payment = require("../models/Payment");

// // // ✅ DO NOT CHANGE THIS URL
// // const CASHFREE_END_POINT = "https://sandbox.cashfree.com/pg/orders";

// // exports.createSession = async (req, res) => {
// //   try {
// //     const { orderId, amount, customerId, customerPhone, customerName } = req.body;

// //     // Use local variables to ensure they are being read from .env correctly
// //     const appId = process.env.CF_APP_ID;
// //     const secretKey = process.env.CF_SECRET;

// //     if (!appId || !secretKey) {
// //       return res.status(500).json({ success: false, message: "Payment Keys Missing in .env" });
// //     }

// //     const cfOrderId = `ORD_${orderId}_${Date.now()}`;

// //     // 🚀 THE POST CALL (Server-to-Server)
// //     const response = await axios({
// //       method: 'post',
// //       url: CASHFREE_END_POINT,
// //       headers: {
// //         "x-client-id": appId,
// //         "x-client-secret": secretKey,
// //         "x-api-version": "2023-08-01",
// //         "Content-Type": "application/json"
// //       },
// //       data: {
// //         order_id: cfOrderId,
// //         order_amount: parseFloat(amount),
// //         order_currency: "INR",
// //         customer_details: {
// //           customer_id: String(customerId),
// //           customer_phone: String(customerPhone),
// //           customer_name: customerName || "Guest User"
// //         }
// //       }
// //     });

// //     await Payment.create({
// //       orderId,
// //       transactionId: cfOrderId,
// //       amount,
// //       status: "PENDING", 
// //     });

// //     // 🎯 Return the Session ID to the Mobile App
// //     res.json({
// //       success: true,
// //       cfOrderId,
// //       paymentSessionId: response.data.payment_session_id 
// //     });

// //   } catch (err) {
// //     // 🔍 THIS WILL SHOW THE REAL ERROR IN YOUR VS CODE TERMINAL
// //     const errorData = err.response?.data || err.message;
// //     console.error("CASHFREE REJECTION:", errorData);
// //     res.status(500).json({ success: false, error: errorData });
// //   }
// // };
// // // controllers/paymentController.js

// // exports.verifyPayment = async (req, res) => {
// //   try {
// //     const { orderId } = req.params; 

// //     const payment = await Payment.findOne({ orderId: orderId });
// //     if (!payment) return res.status(404).json({ success: false, message: "Record not found" });

// //     const response = await axios.get(`${CASHFREE_END_POINT}/${payment.transactionId}`, {
// //       headers: { 
// //           "x-client-id": process.env.CF_APP_ID, 
// //           "x-client-secret": process.env.CF_SECRET, 
// //           "x-api-version": "2023-08-01" 
// //       }
// //     });

// //     // Payment success aana Order status-ai mathanum
// //     if (response.data.order_status === "PAID") {
// //       await Order.findByIdAndUpdate(orderId, { status: "Placed" });
// //       payment.status = "SUCCESS";
// //       await payment.save();

// //       return res.json({ success: true, status: "Placed", message: "Order Success!" });
// //     }

// //     res.json({ success: true, status: "Pending" });
// //   } catch (err) {
// //     res.status(500).json({ success: false, error: err.message });
// //   }
// // };




const axios = require("axios");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;

exports.createPaymentSession = async (req, res) => {
  try {
    const { orderId, amount, customerId, customerPhone, customerName } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const cfOrderId = `CF_${orderId}_${Date.now()}`;

    const response = await axios.post(
      "https://sandbox.cashfree.com/pg/orders",
      {
        order_id: cfOrderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: String(customerId),
          customer_phone: String(customerPhone),
          customer_name: customerName || "Customer"
        },
        order_meta: {
          notify_url: `${process.env.BASE_URL}/api/v1/payments/cashfree/webhook`
        }
      },
      {
        headers: {
          "x-client-id": CF_APP_ID,
          "x-client-secret": CF_SECRET,
          "x-api-version": "2023-08-01",
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
      paymentSessionId: response.data.payment_session_id
    });

  } catch (err) {
    console.error("CASHFREE ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.json({ status: "Pending" });
    res.json({ status: order.status });
  } catch {
    res.json({ status: "Pending" });
  }
};
