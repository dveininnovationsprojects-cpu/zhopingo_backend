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

      
        if (paymentMethod === 'WALLET') {
            const user = await User.findById(customerId);
            if (!user || user.walletBalance < finalAmount) {
                return res.status(400).json({ success: false, error: "Insufficient Wallet Balance" });
            }

            user.walletBalance -= finalAmount;
            user.walletTransactions.unshift({
                amount: finalAmount,
                type: 'DEBIT',
                reason: `Paid for Order #${orderId}`,
                date: new Date()
            });
            await user.save();

           
            await Order.findByIdAndUpdate(orderId, { status: 'Placed' });
            await Payment.create({ orderId, transactionId: `WAL-${Date.now()}`, amount: finalAmount, status: 'Success' });

            return res.json({ success: true, message: "Wallet Payment Success" });
        }

       
        const cfOrderId = `ORD_${orderId}_${Date.now()}`; // தனித்துவமான ஐடி
        const serverURL = "http://54.157.210.26"; 
        const returnURL = `${serverURL}/api/v1/payments/verify?order_id={order_id}&internal_id=${orderId}`;

        const response = await axios.post(CF_URL, {
            order_id: cfOrderId,
            order_amount: finalAmount,
            order_currency: "INR",
            customer_details: {
                customer_id: customerId.toString(),
                customer_phone: customerPhone,
                customer_name: customerName || "Zhopingo User"
            },
            order_meta: { return_url: returnURL }
        }, {
            headers: {
                "x-client-id": CF_APP_ID,
                "x-client-secret": CF_SECRET,
                "x-api-version": "2023-08-01"
            }
        });

        res.json({ success: true, payment_url: response.data.payment_link });

    } catch (err) {
        res.status(500).json({ success: false, error: "Payment Gateway Error" });
    }
};

// 🌟 3. VERIFY PAYMENT (இறுதித் திருத்தம்)
exports.verifyPayment = async (req, res) => {
    try {
        const { order_id, internal_id } = req.query; // URL-ல் இருந்து எடுக்கும்

        const response = await axios.get(`${CF_URL}/${order_id}`, {
            headers: { "x-client-id": CF_APP_ID, "x-client-secret": CF_SECRET, "x-api-version": "2023-08-01" }
        });

        if (response.data.order_status === "PAID") {
            // ஆர்டரை Placed ஆக மாற்றுதல்
            await Order.findByIdAndUpdate(internal_id, { status: 'Placed' });
            
            res.send(`<html><body style="text-align:center; padding-top:50px;">
                <h1 style="color:green;">Payment Successful! ✅</h1>
                <script>setTimeout(() => { window.location.href = "zhopingo://payment-success"; }, 2000);</script>
            </body></html>`);
        } else {
            res.status(400).send("Payment Failed");
        }
    } catch (err) {
        res.status(500).send("Verification Error");
    }
};