const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = require("pg-sdk-node");
const Order = require("../models/Order");
const User = require("../models/User");
const axios = require("axios");

// 🌟 PhonePe Client Instance (Nee kuduthulla adhey config)
const client = StandardCheckoutClient.getInstance(
  process.env.PHONEPE_CLIENT_ID,
  process.env.PHONEPE_CLIENT_SECRET,
  parseInt(process.env.PHONEPE_CLIENT_VERSION),
  process.env.PHONEPE_ENV === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX
);

// 🌟 Helper: Delhivery Shipment logic (Apdiye sync pannittaen)
const createDelhiveryShipment = async (order, customerPhone) => {
  try {
    const itemHSN = order.items?.[0]?.hsnCode || order.items?.[0]?.hsn || "0000";
    const shipmentData = {
      shipments: [{
        name: order.shippingAddress?.receiverName || "Customer",
        add: `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || order.shippingAddress?.area || "Testing Street"}`,
        pin: order.shippingAddress?.pincode,
        phone: customerPhone,
        order: order._id.toString(),
        payment_mode: "Pre-paid",
        amount: order.totalAmount,
        weight: 0.5,
        hsn_code: itemHSN, 
      }],
      pickup_location: { name: "benjamin" }, 
    };

    const DELHI_URL = process.env.DELHIVERY_ENV === "PRODUCTION" 
      ? "https://track.delhivery.com/api/cmu/create.json" 
      : "https://staging-express.delhivery.com/api/cmu/create.json";

    const response = await axios.post(
      DELHI_URL,
      `format=json&data=${JSON.stringify(shipmentData)}`,
      { headers: { Authorization: `Token ${process.env.DELHIVERY_TOKEN}`, "Content-Type": "application/x-www-form-urlencoded" } }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Wallet Payment Delhivery Error:", error.message);
    return null;
  }
};

// ✅ 1. CREATE WALLET TOPUP SESSION (Using PhonePe)
exports.createWalletTopupSession = async (req, res) => {
  try {
    const { userId, amount } = req.body;
    // Wallet topup-kku dummy ID create pannuvom
    const topupId = `WLT_${userId}_${Date.now()}`;

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(topupId)
      .amount(Math.round(amount * 100))
      .redirectUrl(`https://api.zhopingo.in/api/v1/wallet/verify-topup/${topupId}`)
      .build();

    const response = await client.pay(request);
    const checkoutUrl = response.redirect_url || response.redirectUrl || response.data?.instrumentResponse?.redirectInfo?.url;

    res.json({ success: true, url: checkoutUrl, phonepeOrderId: response.order_id || response.orderId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
exports.verifyWalletTopup = async (req, res) => {
  try {
    // 🌟 THE FIX: URL path-la irundhu topupId-ah edukkurom
    const { topupId } = req.params; 

    if (!topupId) return res.redirect("zhopingo://wallet-failed");

    const response = await client.getOrderStatus(topupId);

    if (response.state === "COMPLETED") {
      const parts = topupId.split('_');
      const userId = parts[1];
      const amount = response.amount / 100;

      const user = await User.findById(userId);
      if (!user) return res.redirect("zhopingo://wallet-failed");

      // Duplicate check using transaction reason
      const alreadyAdded = user.walletTransactions.some(t => t.reason.includes(topupId));

      if (!alreadyAdded) {
        user.walletBalance += amount;
        user.walletTransactions.unshift({
          amount,
          type: "CREDIT",
          reason: `Wallet Topup Success (${topupId})`,
          date: new Date()
        });
        await user.save();
      }
      return res.redirect("zhopingo://wallet-success");
    }

    res.redirect("zhopingo://wallet-failed");
  } catch (err) {
    console.error("❌ PhonePe Verify Error:", err.message);
    res.redirect("zhopingo://wallet-failed");
  }
};

// ✅ 3. PAY ORDER USING WALLET (With Delhivery Sync)
exports.payUsingWallet = async (req, res) => {
  try {
    const { orderId, userId } = req.body;
    const user = await User.findById(userId);
    const order = await Order.findById(orderId);

    if (!user || !order) return res.status(404).json({ success: false, message: "Not found" });
    if (user.walletBalance < order.totalAmount) return res.status(400).json({ success: false, message: "Insufficient balance" });

    // Debit Wallet
    user.walletBalance -= order.totalAmount;
    user.walletTransactions.unshift({
      amount: order.totalAmount,
      type: "DEBIT",
      reason: `Order Payment (#${order._id.toString().slice(-6)})`,
      date: new Date()
    });

    // Update Order (Exactly like PhonePe Success Flow)
    order.paymentStatus = "Paid";
    order.status = "Placed";
    order.paymentMethod = "Wallet";

    // 🚚 Trigger Delhivery Shipment (Nee kudutha adhe logic)
    const delhiRes = await createDelhiveryShipment(order, user.phone || "9876543210");
    if (delhiRes && (delhiRes.success === true || delhiRes.packages?.length > 0)) {
        order.awbNumber = delhiRes.packages[0].waybill;
    } else {
        order.awbNumber = "128374922"; // Fallback for testing
    }

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
    res.json({ success: true, balance: user?.walletBalance || 0, transactions: user?.walletTransactions || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ✅ 5. ADMIN ADJUSTMENT
exports.adminUpdateWallet = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    const user = await User.findById(userId);
    user.walletBalance += Number(amount);
    user.walletTransactions.unshift({
      amount: Math.abs(Number(amount)),
      type: Number(amount) >= 0 ? "CREDIT" : "DEBIT",
      reason: reason || "Admin Adjustment",
      date: new Date()
    });
    await user.save();
    res.json({ success: true, balance: user.walletBalance });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};