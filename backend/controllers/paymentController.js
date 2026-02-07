// const Order = require("../models/Order");
// const Payment = require("../models/Payment");

// exports.createPaymentSession = async (req, res) => {
//   try {
//     const { orderId, amount } = req.body;

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }

   
//     await Payment.create({
//       orderId,
//       transactionId: `AUTO_${Date.now()}`,
//       amount,
//       status: "SUCCESS"
//     });

   
//     order.status = "Placed";
//     await order.save();

//     return res.json({
//       success: true,
//       status: "Placed",
//       message: "Payment auto-success"
//     });

//   } catch (err) {
//     console.error("AUTO PAYMENT ERROR:", err.message);
//     return res.status(500).json({ success: false });
//   }
// };


// exports.verifyPayment = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.orderId);
//     if (!order) return res.status(404).json({ success: false });

//     return res.json({
//       success: true,
//       status: order.status
//     });
//   } catch {
//     return res.status(500).json({ success: false });
//   }
// };



const axios = require("axios");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

// DO NOT CHANGE THIS URL
const CASHFREE_END_POINT = "https://sandbox.cashfree.com/pg/orders";

exports.createSession = async (req, res) => {
  try {
    const { orderId, amount, customerId, customerPhone, customerName } = req.body;

    // Use local variables to ensure they are being read from .env correctly
    const appId = process.env.CF_APP_ID;
    const secretKey = process.env.CF_SECRET;

    if (!appId || !secretKey) {
      return res.status(500).json({ success: false, message: "Payment Keys Missing in .env" });
    }

    const cfOrderId = `ORD_${orderId}_${Date.now()}`;

    // THE POST CALL (Server-to-Server)
    const response = await axios({
      method: 'post',
      url: CASHFREE_END_POINT,
      headers: {
        "x-client-id": appId,
        "x-client-secret": secretKey,
        "x-api-version": "2023-08-01",
        "Content-Type": "application/json"
      },
      data: {
        order_id: cfOrderId,
        order_amount: parseFloat(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: String(customerId),
          customer_phone: String(customerPhone),
          customer_name: customerName || "Guest User"
        }
      }
    });

    await Payment.create({
      orderId,
      transactionId: cfOrderId,
      amount,
      status: "PENDING", 
    });

    //  Return the Session ID to the Mobile App
    res.json({
      success: true,
      cfOrderId,
      paymentSessionId: response.data.payment_session_id 
    });

  } catch (err) {
    //  THIS WILL SHOW THE REAL ERROR IN YOUR VS CODE TERMINAL
    const errorData = err.response?.data || err.message;
    console.error("CASHFREE REJECTION:", errorData);
    res.status(500).json({ success: false, error: errorData });
  }
};
// controllers/paymentController.js

exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params; 

    const payment = await Payment.findOne({ orderId: orderId });
    if (!payment) return res.status(404).json({ success: false, message: "Record not found" });

    const response = await axios.get(`${CASHFREE_END_POINT}/${payment.transactionId}`, {
      headers: { 
          "x-client-id": process.env.CF_APP_ID, 
          "x-client-secret": process.env.CF_SECRET, 
          "x-api-version": "2023-08-01" 
      }
    });

    // Payment success aana Order status-ai mathanum
    if (response.data.order_status === "PAID") {
      await Order.findByIdAndUpdate(orderId, { status: "Placed" });
      payment.status = "SUCCESS";
      await payment.save();

      return res.json({ success: true, status: "Placed", message: "Order Success!" });
    }

    res.json({ success: true, status: "Pending" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};