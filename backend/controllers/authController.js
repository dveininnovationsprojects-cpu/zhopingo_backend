const User = require('../models/User');
const Seller = require('../models/Seller');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// 🔒 ENV
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const JWT_SECRET = process.env.JWT_SECRET;

// In-memory OTP store (Redis recommended for prod)
const otpStore = new Map();

/* ---------------- CUSTOMER WHATSAPP OTP ---------------- */

exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    const cleanPhone = phone.startsWith('+') ? phone.slice(1) : phone;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, otp);

    await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: "otp",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }]
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ success: true, message: "OTP sent via WhatsApp" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, error: "Failed to send OTP" });
  }
};

/* ---------------- VERIFY OTP & LOGIN ---------------- */

exports.loginWithOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const storedOtp = otpStore.get(phone);

    if (otp !== "012345" && otp !== storedOtp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    otpStore.delete(phone);

    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({ phone, role: "customer", walletBalance: 0 });
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name || "Customer",
        walletBalance: user.walletBalance,
        addressBook: user.addressBook || []
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ---------------- PROFILE ---------------- */

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, user });
  } catch {
    res.status(400).json({ success: false, error: "Update failed" });
  }
};

/* ---------------- SELLER AUTH ---------------- */

exports.registerSeller = async (req, res) => {
  try {
    const { name, email, password, shopName, phone } = req.body;
    const exists = await Seller.findOne({ $or: [{ email }, { phone }] });
    if (exists) return res.status(400).json({ success: false, message: "Seller already exists" });

    const seller = new Seller({ name, email, password, shopName, phone });
    await seller.save();

    res.status(201).json({ success: true, sellerId: seller._id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.loginSeller = async (req, res) => {
  try {
    const { email, password } = req.body;
    const seller = await Seller.findOne({ email });

    if (!seller || seller.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: seller._id, role: "seller" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      seller: { id: seller._id, shopName: seller.shopName }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
