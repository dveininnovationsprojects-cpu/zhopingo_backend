const axios = require('axios');
const Payment = require('../models/Payment');
const Order = require('../models/Order');

const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;
const CF_URL = process.env.CF_URL;

exports.createSession = async (req, res) => {
    try {
        const { orderId, amount, customerId, customerPhone, customerName } = req.body;

        const response = await axios.post(CF_URL,
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
                    // Updated return URL for production/mobile app handling
                    return_url: `http://192.168.1.10:5000/api/v1/payments/verify?order_id={order_id}`
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
            order_id: response.data.order_id,
            payment_session_id: response.data.payment_session_id, // Needed for SDK
            payment_url: response.data.payment_link || response.data.order_pay_url
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.response?.data?.message || err.message });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const orderId = req.body.orderId || req.query.order_id;

        const response = await axios.get(`${CF_URL}/${orderId}`, {
            headers: {
                "x-client-id": CF_APP_ID,
                "x-client-secret": CF_SECRET,
                "x-api-version": "2023-08-01"
            }
        });

        if (response.data.order_status === "PAID") {
            // 1. Update Payment Record
            await Payment.findOneAndUpdate(
                { orderId },
                { status: "Success", transactionId: response.data.order_id, rawResponse: response.data },
                { upsert: true }
            );

            // 2. IMPORTANT: Update the Order Status to 'Placed'
            const updatedOrder = await Order.findOneAndUpdate(
                { _id: orderId },
                { status: 'Placed' },
                { new: true }
            );

            return res.json({ success: true, message: "Payment Verified & Order Placed", order: updatedOrder });
        }

        res.status(400).json({ success: false, message: "Payment failed or pending at Cashfree" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};