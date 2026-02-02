const axios = require('axios');
const Payment = require('../models/Payment');
const Order = require('../models/Order');

const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;
const CF_URL = process.env.CF_URL; // e.g., https://sandbox.cashfree.com/pg/orders

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
                    
                    return_url: `http://54.157.210.26/api/v1/payments/verify?order_id={order_id}`
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
        res.status(500).json({ success: false, error: err.response?.data?.message || err.message });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const orderId = req.query.order_id || req.body.orderId;

        const response = await axios.get(`${CF_URL}/${orderId}`, {
            headers: {
                "x-client-id": CF_APP_ID,
                "x-client-secret": CF_SECRET,
                "x-api-version": "2023-08-01"
            }
        });

        if (response.data.order_status === "PAID") {
           
            await Order.findByIdAndUpdate(orderId, { 
                status: 'Placed', 
                paymentStatus: 'Paid' 
            });

            
            res.send("<h1>Payment Successful!</h1><p>You can close this window now.</p>");
        } else {
            res.status(400).send("<h1>Payment Failed</h1>");
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};