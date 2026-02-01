const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User");


const JWT_SECRET = process.env.JWT_SECRET;

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const otpStore = new Map();
/* -------- SEND OTP VIA WHATSAPP (AUTHENTICATION TEMPLATE) -------- */


exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: "Phone required" });

    const cleanPhone = phone.replace("+", ""); 
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(cleanPhone, otp);

    const whatsappPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: "otp", 
        language: { code: "en" }, 
        components: [
          {
            type: "body", 
            parameters: [
              {
                type: "text",
                text: otp 
              }
            ]
          },
          {
            type: "button", 
            sub_type: "url", 
            index: 0,
            parameters: [
              {
                type: "text",
                text: otp 
              }
            ]
          }
        ]
      }
    };

    await axios.post(
      `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`,
      whatsappPayload,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ success: true, message: "OTP sent with fixed sub_type" });
  } catch (err) {
    console.error("WhatsApp Error Log:", JSON.stringify(err.response?.data || err.message, null, 2));
    res.status(500).json({ success: false, error: err.response?.data || "Meta API Error" });
  }
};
/* -------- VERIFY OTP & LOGIN WITH COOKIES -------- */
exports.loginWithOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const cleanPhone = phone.replace("+", "");

    const storedOtp = otpStore.get(cleanPhone);

    // Master code or original OTP check
    const isMasterCode = (otp === "012345");
    const isCorrectOtp = (storedOtp && storedOtp === otp);

    if (!isMasterCode && !isCorrectOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    otpStore.delete(cleanPhone);

    let user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      user = await User.create({ phone: cleanPhone, role: "customer" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🍪 COOKIE SETTINGS: பிரவுசரில் தானாக ஸ்டோர் ஆக செட்டிங்ஸ்
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 நாட்கள்
      httpOnly: true, // ஜாவாஸ்கிரிப்ட் மூலம் குக்கீஸை திருட முடியாது
      secure: process.env.NODE_ENV === "production", // Production-ல் மட்டும் HTTPS பயன்படுத்தும்
      sameSite: "None" // Cross-site requests-க்கு அவசியம்
    };

    // குக்கீஸை அனுப்புதல்
    res.status(200).cookie("token", token, cookieOptions).json({
      success: true,
      message: "Login successful. Token stored in cookies.",
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role,
        addressBook: user.addressBook || []
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* -------- ADDRESS -------- */
exports.addUserAddress = async (req, res) => {
  const user = await User.findById(req.params.userId);
  user.addressBook.push(req.body);
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
  res.json({ success: true });
};
