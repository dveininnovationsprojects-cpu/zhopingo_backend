const axios = require("axios");
const User = require("../models/User");
const Order = require("../models/Order");

// 🌟 Cashfree Configuration
const CF_BASE_URL = process.env.CF_ENV === "PRODUCTION" 
    ? "https://api.cashfree.com/pg" 
    : "https://sandbox.cashfree.com/pg";

// ✅ 1. CREATE TOPUP SESSION
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
          customer_id: userId.toString(),
          customer_phone: customerPhone.toString(),
          customer_name: customerName || "Zhopingo User"
        },
        order_meta: {
          return_url: `https://api.zhopingo.in/api/v1/wallet/verify-topup?topup_id=${cfOrderId}`
        }
      },
      {
        headers: {
          "x-client-id": process.env.CF_APP_ID,
          "x-client-secret": process.env.CF_SECRET,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ success: true, paymentSessionId: response.data.payment_session_id, cfOrderId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.message || err.message });
  }
};

// ✅ 2. VERIFY TOPUP
exports.verifyWalletTopup = async (req, res) => {
  try {
    const { topup_id } = req.query;
    const response = await axios.get(`${CF_BASE_URL}/orders/${topup_id}`, {
      headers: { "x-client-id": process.env.CF_APP_ID, "x-client-secret": process.env.CF_SECRET, "x-api-version": "2023-08-01" }
    });

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
          reason: `Wallet Topup Success (ID: ${topup_id})`,
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

// ✅ 3. PAY USING WALLET
exports.payUsingWallet = async (req, res) => {
    try {
        const { orderId, userId } = req.body;

        const user = await User.findById(userId);
        const order = await Order.findById(orderId);

        if (!user || !order) {
            return res.status(404).json({ success: false, message: "User or Order not found" });
        }

        if (order.paymentStatus === "Paid") {
            return res.status(400).json({ success: false, message: "Order already paid" });
        }

        // 🛑 Balance Check
        if (user.walletBalance < order.totalAmount) {
            return res.status(400).json({ 
                success: false, 
                message: "Insufficient balance", 
                balance: user.walletBalance,
                required: order.totalAmount 
            });
        }

        // 💸 Debit process
        user.walletBalance -= order.totalAmount;
        user.walletTransactions.unshift({
            amount: order.totalAmount,
            type: "DEBIT",
            reason: `Order Payment (#${order._id.toString().slice(-6)})`,
            date: new Date()
        });

        order.paymentStatus = "Paid";
        order.status = "Placed";
        order.paymentMethod = "Wallet";

        await user.save();
        await order.save();

        res.json({ success: true, message: "Payment Successful!", newBalance: user.walletBalance });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ✅ 4. GET STATUS
exports.getWalletStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("walletBalance walletTransactions");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, balance: user.walletBalance || 0, transactions: user.walletTransactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ✅ 5. ADMIN ADJUSTMENT
exports.adminUpdateWallet = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.walletBalance += Number(amount);
    user.walletTransactions.unshift({
      amount: Math.abs(Number(amount)),
      type: Number(amount) >= 0 ? "CREDIT" : "DEBIT",
      reason: reason || "Admin Adjustment",
      date: new Date()
    });

    await user.save();
    res.json({ success: true, balance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};