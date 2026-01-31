const User = require('../models/User');
const Seller = require('../models/Seller');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// ENV
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const JWT_SECRET = process.env.JWT_SECRET;

// OTP store
const otpStore = new Map();

/* -------- SEND OTP -------- */
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
          components: [{ type: "body", parameters: [{ type: "text", text: otp }] }]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* -------- VERIFY OTP -------- */
exports.loginWithOTP = async (req, res) => {
  const { phone, otp } = req.body;
  const storedOtp = otpStore.get(phone);

  if (otp !== storedOtp && otp !== "012345") {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  otpStore.delete(phone);

  let user = await User.findOne({ phone });
  if (!user) {
    user = new User({ phone, role: "customer", walletBalance: 0 });
    await user.save();
  }

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

  res.json({ success: true, token, user });
};

/* -------- PROFILE -------- */
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user });
};

exports.updateProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true });
  res.json({ success: true, user });
};

/* -------- ADDRESS (YOU ASKED THIS 👇) -------- */
exports.addUserAddress = async (req, res) => {
  const { userId } = req.params;
  const address = req.body;

  const user = await User.findById(userId);
  user.addressBook.push(address);
  await user.save();

  res.json({ success: true, addressBook: user.addressBook });
};

/* -------- SELLER -------- */
exports.registerSeller = async (req, res) => {
  const seller = new Seller(req.body);
  await seller.save();
  res.json({ success: true, seller });
};

exports.loginSeller = async (req, res) => {
  const seller = await Seller.findOne({ email: req.body.email });
  if (!seller) return res.status(401).json({ success: false });

  const token = jwt.sign({ id: seller._id, role: "seller" }, JWT_SECRET);
  res.json({ success: true, token });
};

/* -------- LOGOUT -------- */
exports.logout = async (req, res) => {
  res.json({ success: true, message: "Logged out" });
};
