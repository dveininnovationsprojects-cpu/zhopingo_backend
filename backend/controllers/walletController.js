const User = require('../models/User');
const axios = require('axios');

// Cashfree Credentials from .env
const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;
const CF_URL = process.env.CF_URL;

exports.createWalletTopupSession = async (req, res) => {
    try {
        const { userId, amount, customerPhone, customerName } = req.body;
        const topupId = `TOPUP_${userId}_${Date.now()}`;

        // உங்கள் சர்வர் ஐபி (Port 5000 அல்லது 80 உங்கள் அமைப்பிற்கு ஏற்ப)
        const serverURL = `${req.protocol}://${req.get('host')}`; 
        const returnURL = `${serverURL}/api/v1/wallet/verify-topup?topup_id=${topupId}`;

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
                order_meta: { return_url: returnURL }
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
            order_id: topupId,
            payment_url: response.data.payment_link || response.data.order_pay_url
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.response?.data?.message || err.message });
    }
};

// 🌟 2. VERIFY & APPROVE TOP-UP (User OK கொடுத்த பிறகு அப்டேட் ஆகும்)
exports.verifyWalletTopup = async (req, res) => {
    try {
        const topupId = req.query.topup_id;
        const confirmAction = req.query.confirm; // 🌟 OK பட்டன் அழுத்திய பிறகு இது வரும்

        if (!topupId) return res.status(400).send("Invalid Topup ID");

        // கேஷ்ஃப்ரீயிலிருந்து பேமெண்ட் ஸ்டேட்டஸ் சரிபார்த்தல்
        const response = await axios.get(`${CF_URL}/${topupId}`, {
            headers: {
                "x-client-id": CF_APP_ID,
                "x-client-secret": CF_SECRET,
                "x-api-version": "2023-08-01"
            }
        });

        const isPaid = response.data.order_status === "PAID";
        const amount = Number(response.data.order_amount);
        const userId = response.data.customer_details.customer_id;

        if (!isPaid) return res.status(400).send("<h1>Payment Not Completed</h1>");

        // 🌟 பயனர் இன்னும் OK அழுத்தவில்லை என்றால், Confirmation Screen காட்டுதல்
        if (confirmAction !== "true") {
            return res.send(`
                <div style="text-align:center; padding:50px; font-family:sans-serif;">
                    <h2 style="color:#333;">Payment Received! ₹${amount}</h2>
                    <p>Click below to finalize and add balance to your wallet.</p>
                    <a href="/api/v1/wallet/verify-topup?topup_id=${topupId}&confirm=true" 
                       style="background:#0c831f; color:white; padding:15px 30px; text-decoration:none; border-radius:10px; font-weight:bold; display:inline-block; margin-top:20px;">
                       OK, Approve Top-up
                    </a>
                </div>
            `);
        }

        // 🌟 பயனர் OK அழுத்திவிட்டார் (confirm=true), இப்போது வேலட் அப்டேட் செய்தல்
        const user = await User.findById(userId);
        if (!user) return res.status(404).send("User not found");

        const alreadyProcessed = user.walletTransactions.some(t => t.reason.includes(topupId));
        if (alreadyProcessed) {
            return res.send(`<html><body style="text-align:center; padding:50px;"><h1>Already Added ✅</h1></body></html>`);
        }

        user.walletBalance += amount;
        user.walletTransactions.unshift({
            amount: amount,
            type: 'CREDIT',
            reason: `Wallet Top-up (ID: ${topupId})`,
            date: new Date()
        });

        await user.save();

        res.send(`
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h1 style="color:#0c831f;">Success! ✅</h1>
                <p>₹${amount} added to your wallet.</p>
                <script>
                    setTimeout(function() { window.location.href = "zhopingo://wallet-success"; }, 2000);
                </script>
            </div>
        `);

    } catch (err) {
        res.status(500).send("Verification Error");
    }
};
// 🌟 3. GET WALLET STATUS (பேலன்ஸ் மற்றும் டிரான்ஸாக்ஷன்கள்)
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