const axios = require('axios');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const User = require('../models/User');

const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;
const CF_URL = process.env.CF_URL;

exports.createSession = async (req, res) => {
    try {
        const { orderId, amount, customerId, customerPhone, customerName, paymentMethod } = req.body;
        const finalAmount = Number(amount);

        // 🌟 1. Wallet Payment (Single Debit Logic)
        if (paymentMethod === 'WALLET') {
            const user = await User.findById(customerId);
            if (!user || user.walletBalance < finalAmount) {
                return res.status(400).json({ success: false, error: "Insufficient Wallet Balance" });
            }

            user.walletBalance -= finalAmount;
            user.walletTransactions.unshift({
                amount: finalAmount,
                type: 'DEBIT',
                reason: `Payment for Order: ${orderId}`,
                date: new Date()
            });
            await user.save();

            const order = await Order.findByIdAndUpdate(orderId, { status: 'Placed' }, { new: true });
            await Payment.create({ orderId, transactionId: `WAL-${Date.now()}`, amount: finalAmount, status: 'Success' });

            return res.json({ success: true, message: "Paid via Wallet successfully", order });
        }

        // 🌟 2. Online Payment (Fixing Order ID Format)
        const cfOrderId = `ORD_${Date.now()}`; 
        const serverURL = "http://54.157.210.26"; 
        const returnURL = `${serverURL}/api/v1/payments/verify?order_id={order_id}&internal_id=${orderId}`;

        const response = await axios.post(process.env.CF_URL, {
            order_id: cfOrderId,
            order_amount: finalAmount,
            order_currency: "INR",
            customer_details: {
                customer_id: customerId.toString(),
                customer_phone: customerPhone,
                customer_name: customerName || "Customer"
            },
            order_meta: { return_url: returnURL }
        }, {
            headers: {
                "x-client-id": process.env.CF_APP_ID,
                "x-client-secret": process.env.CF_SECRET,
                "x-api-version": "2023-08-01"
            }
        });

        res.json({ success: true, order_id: cfOrderId, payment_url: response.data.payment_link });

    } catch (err) {
        res.status(500).json({ success: false, error: "Payment Gateway Error" });
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
            await Payment.findOneAndUpdate(
                { orderId },
                { 
                    status: "Success", 
                    transactionId: response.data.cf_order_id, 
                    amount: response.data.order_amount,
                    rawResponse: response.data 
                },
                { upsert: true }
            );

            const updatedOrder = await Order.findByIdAndUpdate(
                orderId,
                { status: 'Placed' },
                { new: true }
            );

            
            res.send(`
                <html>
                    <body style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                        <div style="text-align:center;">
                            <h2 style="color:#0c831f;">Payment Successful! ✅</h2>
                            <p>Order ID: ${orderId}</p>
                            <p>Redirecting back to Zhopingo...</p>
                            <script>
                                setTimeout(function() {
                                    window.location.href = "zhopingo://payment-success?order_id=${orderId}";
                                }, 2000);
                            </script>
                        </div>
                    </body>
                </html>
            `);
        } else {
            res.status(400).send("Payment failed or pending at Cashfree.");
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};