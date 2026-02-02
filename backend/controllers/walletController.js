const User = require('../models/User');
const axios = require('axios');

// Environment Variables
const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;
const CF_URL = process.env.CF_URL;

// 🌟 1. CASHFREE TOP-UP SESSION 
exports.createWalletTopupSession = async (req, res) => {
    try {
        const { userId, amount, customerPhone, customerName } = req.body;
        
       
        const topupId = `TOPUP_${userId}_${Date.now()}`;

        const response = await axios.post(CF_URL,
            {
                order_id: topupId,
                order_amount: amount,
                order_currency: "INR",
                customer_details: {
                    customer_id: userId,
                    customer_phone: customerPhone,
                    customer_name: customerName || "Zhopingo User"
                },
                order_meta: {
                    
                    return_url: `http://54.157.210.26/api/v1/wallet/verify-topup?topup_id={order_id}`
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

//  2. VERIFY CASHFREE TOP-UP (பேமெண்டை சரிபார்த்து வாலட்டில் ஏற்ற)
exports.verifyWalletTopup = async (req, res) => {
    try {
        const topupId = req.query.topup_id;
        if (!topupId) return res.status(400).send("Invalid Topup ID");

        const userId = topupId.split('_')[1];

        const response = await axios.get(`${CF_URL}/${topupId}`, {
            headers: {
                "x-client-id": CF_APP_ID,
                "x-client-secret": CF_SECRET,
                "x-api-version": "2023-08-01"
            }
        });

        if (response.data.order_status === "PAID") {
            const amount = response.data.order_amount;
            const user = await User.findById(userId);
            
            if (!user) return res.status(404).send("User not found");

            
            user.walletBalance += Number(amount);
            user.walletTransactions.unshift({
                amount: Number(amount),
                type: 'CREDIT',
                reason: 'Online Top-up (Cashfree)',
                date: new Date()
            });

            await user.save();
            res.send(`
                <div style="text-align:center; padding:50px; font-family:sans-serif;">
                    <h1 style="color:#0c831f;">Payment Successful! 🎉</h1>
                    <p>₹${amount} has been added to your Zhopingo Wallet.</p>
                    <p>You can close this window now.</p>
                </div>
            `);
        } else {
            res.status(400).send("<h1>Payment Failed or Pending</h1>");
        }
    } catch (err) {
        res.status(500).send("Server Error during verification");
    }
};

//  3. ADMIN MANUAL UPDATE (நீங்கள் கொடுத்த அதே பழைய லாஜிக்)
exports.adminUpdateWallet = async (req, res) => {
    const { userId, amount, reason, type } = req.body; 
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const numAmount = Number(amount);
        if (type === 'CREDIT') {
            user.walletBalance += numAmount;
        } else {
            if (user.walletBalance < numAmount) return res.status(400).json({ error: "Insufficient balance" });
            user.walletBalance -= numAmount;
        }

        user.walletTransactions.unshift({ 
            amount: numAmount, type, reason: reason || "Manual Update", date: new Date() 
        });

        await user.save();
        res.json({ success: true, newBalance: user.walletBalance, transactions: user.walletTransactions });
    } catch (err) { res.status(500).json({ error: "Wallet update failed" }); }
};

//  4. REFUND TO WALLET
exports.refundToWallet = async (req, res) => {
    const { userId, orderId, refundAmount } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        user.walletBalance += Number(refundAmount);
        user.walletTransactions.unshift({ 
            amount: refundAmount, type: 'CREDIT', reason: `Refund for Order: ${orderId}`, date: new Date() 
        });
        await user.save();
        res.json({ success: true, message: "Refund credited", balance: user.walletBalance });
    } catch (err) { res.status(500).json({ error: "Refund failed" }); }
};

//  5. GET WALLET STATUS (
exports.getWalletStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('walletBalance walletTransactions');
    if (!user) return res.status(404).json({ message: "User not found" });
    
    res.json({
      balance: user.walletBalance || 0,
      transactions: user.walletTransactions || []
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};