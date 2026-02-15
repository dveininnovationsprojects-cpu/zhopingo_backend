const axios = require("axios");
const User = require("../models/User");

// 🌟 AWS Env சிக்கலைத் தவிர்க்க நேரடியாக லிங்க் கொடுக்கப்பட்டுள்ளது
const MY_BASE_URL = "https://liliana-exsufflicate-radioactively.ngrok-free.dev";
const CF_BASE_URL = "https://sandbox.cashfree.com/pg";

// 1️⃣ வாலட் டாப்-அப் செஷன் உருவாக்குதல்
exports.createWalletTopupSession = async (req, res) => {
  try {
    const { userId, amount, customerPhone, customerName } = req.body;

    const cfOrderId = `TOPUP_${userId}_${Date.now()}`;

    const response = await axios.post(
      `${CF_BASE_URL}/orders`,
      {
        order_id: cfOrderId,
        order_amount: Number(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: String(userId), // 🌟 String ஆக மாற்றுவது அவசியம்
          customer_phone: String(customerPhone), // 🌟 String ஆக மாற்றுவது அவசியம்
          customer_name: customerName || "User"
        },
        order_meta: {
          // 🌟 Hardcoded URL - verify-topup endpoint-க்கு
          return_url: `${MY_BASE_URL}/api/wallet/verify-topup?topup_id=${cfOrderId}`
        }
      },
      {
        headers: {
          "x-client-id": process.env.CF_APP_ID,
          "x-client-secret": process.env.CF_SECRET,
          "x-api-version": "2023-08-01", // 🌟 SDK-க்குத் தேவையான சரியான வெர்ஷன்
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      cfOrderId // மொபைல் SDK-க்கு இது தேவைப்படலாம்
    });
  } catch (err) {
    console.error("Wallet Session Error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.verifyWalletTopup = async (req, res) => {
  try {
    const { topup_id } = req.query;

    const response = await axios.get(
      `${CF_BASE_URL}/orders/${topup_id}`,
      {
        headers: {
          "x-client-id": process.env.CF_APP_ID,
          "x-client-secret": process.env.CF_SECRET,
          "x-api-version": "2023-08-01"
        }
      }
    );

    if (response.data.order_status === "PAID") {
      const userId = response.data.customer_details.customer_id;
      const amount = Number(response.data.order_amount);

      const user = await User.findById(userId);
      if (!user) return res.redirect("zhopingo://wallet-failed");

      
      const alreadyAdded = user.walletTransactions.some(t => t.txnId === topup_id);

      if (!alreadyAdded) {
        user.walletBalance += amount;
        user.walletTransactions.unshift({
          amount,
          type: "CREDIT",
          reason: "Wallet Topup", 
          txnId: topup_id, 
          date: new Date()
        });
        await user.save();
      }

      return res.redirect("zhopingo://wallet-success");
    }

    res.redirect("zhopingo://wallet-failed");
  } catch (err) {
    console.error("Wallet Verify Error:", err.message);
    res.redirect("zhopingo://wallet-failed");
  }
};
// 3️⃣ வாலட் பேலன்ஸ் மற்றும் ஹிஸ்டரி பார்த்தல்
exports.getWalletStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "walletBalance walletTransactions"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      balance: user.walletBalance,
      transactions: user.walletTransactions
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 4️⃣ வாலட் மூலம் ஆர்டருக்குப் பணம் செலுத்துதல்
exports.payUsingWallet = async (req, res) => {
  try {
    const { userId, amount, orderId } = req.body;
    const user = await User.findById(userId);

    if (!user || user.walletBalance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient Wallet Balance" });
    }

    user.walletBalance -= Number(amount);

    user.walletTransactions.unshift({
      amount: Number(amount),
      type: 'DEBIT',
      reason: `Paid for Order #${orderId}`,
      date: new Date()
    });

    await user.save();
    res.json({ success: true, message: "Payment Successful", newBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 5️⃣ அட்மின் மூலம் வாலட் திருத்தம் (Refund etc.)
exports.adminUpdateWallet = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.walletBalance += Number(amount);
    user.walletTransactions.unshift({
      amount: Number(amount),
      type: amount >= 0 ? "CREDIT" : "DEBIT",
      reason: reason || "Admin Adjustment",
      date: new Date()
    });

    await user.save();
    res.json({ success: true, balance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};