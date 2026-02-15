const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User");


const JWT_SECRET = process.env.JWT_SECRET;

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const otpStore = new Map();


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



exports.loginWithOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    const cleanPhone = phone.replace("+", "");

    const storedOtp = otpStore.get(cleanPhone);

  
    const isCorrectOtp = (storedOtp && storedOtp === otp);

    if (!isCorrectOtp) {
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


    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production", 
      sameSite: "Lax" 
    };

 
    res.status(200).cookie("token", token, cookieOptions).json({
      success: true,
      token: token, 
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role,
        name: user.name || "Customer",
        addressBook: user.addressBook || []
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.addUserAddress = async (req, res) => {
  try {
    // 🌟 URL-ல் இருந்து வரும் ID அல்லது Token-ல் இருந்து வரும் ID எதாவது ஒன்றை எடுப்பது பாதுகாப்பு
    const userId = req.params.userId || req.user.id; 
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { flatNo, addressLine, pincode, addressType, isDefault } = req.body;

    // Default logic
    if (isDefault) {
      user.addressBook.forEach(addr => addr.isDefault = false);
    }

    // 🌟 மாடலில் உள்ள ஃபீல்டு பெயர்கள் 'label', 'addressLine' போன்றவை. 
    // நீ அனுப்பும் 'addressType'-ஐ 'label'-ஆக மாற்றுகிறோம்.
    const newAddress = {
      label: addressType || "Home", 
      flatNo: flatNo,
      addressLine: addressLine,
      pincode: pincode,
      isDefault: isDefault || user.addressBook.length === 0
    };

    user.addressBook.push(newAddress);
    await user.save();

    res.json({ 
      success: true, 
      message: "Address saved successfully",
      user: {
        id: user._id,
        phone: user.phone,
        role: user.role,
        name: user.name || "Customer",
        addressBook: user.addressBook
      }
    });
  } catch (err) {
    console.error("Address Error:", err); // எர்ரரை செக் செய்ய
    res.status(500).json({ success: false, error: err.message });
  }
};

/* -------- LOGOUT -------- */
exports.logout = async (req, res) => {
  res.json({ success: true });
};
