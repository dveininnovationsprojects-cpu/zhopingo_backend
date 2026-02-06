const User = require('../models/User');
const axios = require('axios');

// Cashfree Credentials
const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;
// Hardcode the URL directly for the APK to work
const CF_BASE_URL = "https://sandbox.cashfree.com/pg";

// 🌟 Wallet Controller (அதே உங்களுடைய ஸ்டைலில்)
exports.createWalletTopupSession = async (req, res) => {
    try {
        const { userId, amount, customerPhone, customerName } = req.body;
        const cfOrderId = `TOPUP_${userId}_${Date.now()}`;

        const response = await axios.post(CF_BASE_URL + "/orders", {
            order_id: cfOrderId,
            order_amount: amount,
            order_currency: "INR",
            customer_details: {
                customer_id: userId,
                customer_phone: customerPhone,
                customer_name: customerName || "Customer"
            }
        }, {
            headers: {
                "x-client-id": CF_APP_ID,
                "x-client-secret": CF_SECRET,
                "x-api-version": "2023-08-01"
            }
        });

        // 🌟 ஆர்டர் கண்ட்ரோலர் போலவே உடனடி அப்டேட்
        const user = await User.findById(userId);
        if (user) {
            user.walletBalance += Number(amount);
            user.walletTransactions.unshift({
                amount: amount,
                type: 'CREDIT',
                reason: `Wallet Topup (ID: ${cfOrderId})`,
                date: new Date()
            });
            await user.save();
        }

        res.json({
            success: true,
            cfOrderId,
            paymentSessionId: response.data.payment_session_id
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.verifyWalletTopup = async (req, res) => {
    try {
        const topupId = req.query.topup_id;
        if (!topupId) return res.status(400).send("Invalid Topup ID");

        // Cashfree-யிலிருந்து பேமெண்ட் நிலையைச் சரிபார்க்கவும்
        const response = await axios.get(`${CF_BASE_URL}/orders/${topupId}`, {
            headers: {
                "x-client-id": CF_APP_ID,
                "x-client-secret": CF_SECRET,
                "x-api-version": "2023-08-01"
            }
        });

        // ஸ்டேட்டஸ் PAID ஆக இருந்தால் மட்டும் வேலட்டில் சேர்க்கவும்
        if (response.data.order_status === "PAID") {
            const amount = Number(response.data.order_amount);
            const userId = response.data.customer_details.customer_id;
            
            const user = await User.findById(userId);
            if (!user) return res.status(404).send("User not found");

            // 🔁 டூப்ளிகேட் என்ட்ரியைத் தவிர்க்க (Payout லாஜிக் போல)
            const alreadyProcessed = user.walletTransactions.some(t => t.reason.includes(topupId));
            
            if (!alreadyProcessed) {
                user.walletBalance = (user.walletBalance || 0) + amount;
                user.walletTransactions.unshift({
                    amount: amount,
                    type: 'CREDIT',
                    reason: `Wallet Recharge (ID: ${topupId})`,
                    date: new Date()
                });
                await user.save();
            }

            // வெற்றிகரமான மெசேஜ் மற்றும் ஆப்பிற்குத் திரும்புதல்
            res.send(`
                <div style="text-align:center; padding:50px; font-family:sans-serif;">
                    <h1 style="color:#0c831f;">Payment Successful! ✅</h1>
                    <p style="font-size:18px;">₹${amount} added to your Zhopingo Wallet.</p>
                    <script>
                        setTimeout(() => { window.location.href = "zhopingo://wallet"; }, 2000);
                    </script>
                </div>
            `);
        } else {
            res.send(`
                <div style="text-align:center; padding:50px; font-family:sans-serif;">
                    <h1 style="color:#e11d48;">Payment Failed or Pending ❌</h1>
                    <p>Please try again if the amount was not deducted.</p>
                    <script>
                        setTimeout(() => { window.location.href = "zhopingo://wallet"; }, 3000);
                    </script>
                </div>
            `);
        }
    } catch (err) {
        console.error("Verification Error:", err.message);
        res.status(500).send("Verification Error");
    }
};

// 🌟 3. GET WALLET STATUS
exports.getWalletStatus = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('walletBalance walletTransactions');
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        
        res.json({
            success: true,
            balance: user.walletBalance || 0,
            transactions: user.walletTransactions || []
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🌟 4. ADMIN MANUAL UPDATE (அட்மின் பணத்தை கூட்டவோ குறைக்கவோ)
exports.adminUpdateWallet = async (req, res) => {
    try {
        const { userId, amount, reason, type } = req.body; // type: 'CREDIT' or 'DEBIT'
        const user = await User.findById(userId);
        
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (type === 'CREDIT') {
            user.walletBalance += Number(amount);
        } else {
            if (user.walletBalance < amount) return res.status(400).json({ error: "Insufficient balance" });
            user.walletBalance -= Number(amount);
        }

        user.walletTransactions.unshift({ 
            amount: Number(amount), type, reason: reason || "Admin Adjustment", date: new Date() 
        });

        await user.save();
        res.json({ success: true, balance: user.walletBalance });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


// const axios = require("axios");
// const Order = require("../models/Order");
// const Payment = require("../models/Payment");

// const CF_BASE_URL = "https://sandbox.cashfree.com/pg"; // Live-க்கு மாறும்போது இதை மாற்றவும்
// const CF_APP_ID = process.env.CF_APP_ID;
// const CF_SECRET = process.env.CF_SECRET;

// /* =====================================================
//     1. CREATE SESSION (பாதுகாப்பான முறை)
// ===================================================== */
// exports.createSession = async (req, res) => {
//   try {
//     const { orderId, amount, customerId, customerPhone, customerName } = req.body;

//     const order = await Order.findById(orderId);
//     if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//     const cfOrderId = `CF_${orderId}_${Date.now()}`;

//     const response = await axios.post(`${CF_BASE_URL}/orders`,
//       {
//         order_id: cfOrderId,
//         order_amount: amount,
//         order_currency: "INR",
//         customer_details: {
//           customer_id: customerId.toString(),
//           customer_phone: customerPhone,
//           customer_name: customerName || "Customer"
//         }
//       },
//       {
//         headers: {
//           "x-client-id": CF_APP_ID,
//           "x-client-secret": CF_SECRET,
//           "x-api-version": "2023-08-01",
//           "Content-Type": "application/json"
//         }
//       }
//     );

//     // 🌟 1. இங்கே 'PENDING' என்று மட்டுமே சேமிக்கிறோம் (டூப்ளிகேட் தவிர்க்க)
//     await Payment.create({
//       orderId,
//       transactionId: cfOrderId,
//       amount,
//       status: "PENDING", 
//     });

//     // 🌟 2. உங்கள் ஆப்பிற்குத் தேவையான 'payment_session_id' இதோ!
//     res.json({
//       success: true,
//       cfOrderId,
//       paymentSessionId: response.data.payment_session_id
//     });

//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// /* =====================================================
//     2. VERIFY PAYMENT (நிஜமான பேமெண்ட் உறுதி செய்தல்)
// ===================================================== */
// exports.verifyPayment = async (req, res) => {
//   try {
//     const { orderId } = req.params; 
    
//     // பேமெண்ட் விபரத்தை எடுத்தல்
//     const payment = await Payment.findOne({ orderId: orderId }).sort({ createdAt: -1 });
//     if (!payment) return res.json({ success: true, status: "Pending" });

//     // 🌟 3. கேஷ்ஃப்ரீ சர்வரில் செக் செய்தல்
//     const response = await axios.get(`${CF_BASE_URL}/orders/${payment.transactionId}`, {
//       headers: { 
//           "x-client-id": CF_APP_ID, 
//           "x-client-secret": CF_SECRET, 
//           "x-api-version": "2023-08-01" 
//       }
//     });

//     // 🌟 4. நிஜமாகவே PAID ஆனால் மட்டுமே 'Placed' என மாற்றவும்
//     if (response.data.order_status === "PAID" || response.data.order_status === "ACTIVE") {
//       await Order.findByIdAndUpdate(orderId, { status: "Placed" });
//       payment.status = "SUCCESS";
//       await payment.save();

//       return res.json({ success: true, status: "Placed" });
//     }

//     res.json({ success: true, status: "Pending" });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };