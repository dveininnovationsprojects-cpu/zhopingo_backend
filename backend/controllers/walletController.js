const axios = require("axios");
const User = require("../models/User");

const CF_BASE_URL = "https://sandbox.cashfree.com/pg";

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
          customer_id: userId,
          customer_phone: customerPhone,
          customer_name: customerName || "User"
        },
       order_meta: {
  return_url: `https://zhopingo.in/api/wallet/verify-topup?topup_id=${cfOrderId}`
}

      },
      {
        headers: {
          "x-client-id": process.env.CF_APP_ID,
          "x-client-secret": process.env.CF_SECRET,
          "x-api-version": "2025-01-01"
        }
      }
    );

    res.json({
      success: true,
      paymentSessionId: response.data.payment_session_id
    });
  } catch (err) {
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
          "x-api-version": "2025-01-01"
        }
      }
    );

    if (response.data.order_status === "PAID") {
      const userId = response.data.customer_details.customer_id;
      const amount = Number(response.data.order_amount);

      const user = await User.findById(userId);
      const alreadyAdded = user.walletTransactions.some(t => t.reason.includes(topup_id));

      if (!alreadyAdded) {
        user.walletBalance += amount;
        user.walletTransactions.unshift({
          amount,
          type: "CREDIT",
          reason: `Wallet Topup (${topup_id})`,
          date: new Date()
        });
        await user.save();
      }

      return res.redirect("zhopingo://wallet-success");
    }

    res.redirect("zhopingo://wallet-failed");
  } catch {
    res.redirect("zhopingo://wallet-failed");
  }
};
// ✅ GET WALLET STATUS
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

// ✅ ADMIN WALLET UPDATE
exports.adminUpdateWallet = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

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
