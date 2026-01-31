const axios = require('axios');
const Payment = require('../models/Payment');

// 🔒 ENV VARIABLES
const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;
const CF_URL = process.env.CF_URL;

// CREATE PAYMENT SESSION
exports.createSession = async (req, res) => {
  try {
    const { orderId, amount, customerId, customerPhone, customerName } = req.body;

    const response = await axios.post(
      CF_URL,
      {
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: customerId,
          customer_phone: customerPhone,
          customer_name: customerName
        },
        order_meta: {
          return_url: `http://localhost:19006/OrderSuccess?order_id={order_id}`
        }
      },
      {
        headers: {
          "x-client-id": CF_APP_ID,
          "x-client-secret": CF_SECRET,
          "x-api-version": "2023-08-01"
        }
      }
    );

    res.json({
      success: true,
      payment_url: response.data.payment_link || response.data.order_pay_url
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// VERIFY PAYMENT
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const response = await axios.get(`${CF_URL}/${orderId}`, {
      headers: {
        "x-client-id": CF_APP_ID,
        "x-client-secret": CF_SECRET,
        "x-api-version": "2023-08-01"
      }
    });

    if (response.data.order_status === "PAID") {
      const payment = await Payment.findOneAndUpdate(
        { orderId },
        {
          status: "Success",
          transactionId: response.data.order_id,
          rawResponse: response.data
        },
        { upsert: true, new: true }
      );

      return res.json({ success: true, data: payment });
    }

    res.status(400).json({ success: false, message: "Payment not completed" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
