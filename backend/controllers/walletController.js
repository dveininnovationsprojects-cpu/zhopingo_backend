const User = require('../models/User');
const axios = require('axios');

// Cashfree Credentials
const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;
const CF_URL = process.env.CF_URL;

// 🌟 1. CREATE WALLET TOP-UP SESSION (Cashfree Payment Link)
exports.createWalletTopupSession = async (req, res) => {
    try {
        const { userId, amount, customerPhone, customerName } = req.body;
        
        // தனித்துவமான டாப்-அப் ஐடி
        const topupId = `TOPUP_${userId}_${Date.now()}`;

        // சர்வர் URL மற்றும் ரிட்டர்ன் URL (Verified automatically by Cashfree)
        const serverURL = `${req.protocol}://${req.get('host')}`; 
        const returnURL = `${serverURL}/api/v1/wallet/verify-topup?topup_id=${topupId}`;

        const response = await axios.post(CF_URL,
            {
                order_id: topupId,
                order_amount: Number(amount),
                order_currency: "INR",
                customer_details: {
                    customer_id: userId,
                    customer_phone: customerPhone,
                    customer_name: customerName || "Zhopingo User"
                },
                order_meta: {
                    return_url: returnURL
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
            order_id: topupId,
            payment_url: response.data.payment_link || response.data.order_pay_url
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.response?.data?.message || err.message });
    }
};

// 🌟 2. VERIFY TOP-UP & AUTO-CREDIT (தானாக பணம் ஏறும் லாஜிக்)
exports.verifyWalletTopup = async (req, res) => {
    try {
        const topupId = req.query.topup_id;
        if (!topupId) return res.status(400).send("Invalid Topup ID");

        // Cashfree-யிலிருந்து பேமெண்ட் நிலையைச் சரிபார்க்கவும்
        const response = await axios.get(`${CF_URL}/${topupId}`, {
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