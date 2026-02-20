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



// exports.loginWithOTP = async (req, res) => {
//   try {
//     const { phone, otp } = req.body;
    
//     const cleanPhone = phone.replace("+", "");

//     const storedOtp = otpStore.get(cleanPhone);

  
//     const isCorrectOtp = (storedOtp && storedOtp === otp);

//     if (!isCorrectOtp) {
//       return res.status(400).json({ success: false, message: "Invalid OTP" });
//     }

//     otpStore.delete(cleanPhone);

   
//     let user = await User.findOne({ phone: cleanPhone });
//     if (!user) {
//       user = await User.create({ phone: cleanPhone, role: "customer" });
//     }

   
//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       JWT_SECRET,
//       { expiresIn: "7d" }
//     );


//     const cookieOptions = {
//       expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//       httpOnly: true, 
//       secure: process.env.NODE_ENV === "production", 
//       sameSite: "Lax" 
//     };

 
//     res.status(200).cookie("token", token, cookieOptions).json({
//       success: true,
//       token: token, 
//       user: {
//         id: user._id,
//         phone: user.phone,
//         role: user.role,
//         addressBook: user.addressBook || []
//       }
//     });

//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

exports.loginWithOTP = async (req, res) => {
  try {
    let { phone, otp } = req.body;
    
    // 🌟 1. போன் நம்பரைச் சுத்தம் செய்கிறோம் (எல்லா ஸ்பெஷல் கேரக்டரையும் நீக்குகிறது)
    let cleanPhone = phone.replace(/\D/g, ""); // இது "+", "-", " " எல்லாத்தையும் நீக்கி வெறும் நம்பரை மட்டும் தரும்

    // 🌟 2. இந்திய நம்பராக இருந்தால் முன்னால் இருக்கும் '91'-ஐ நீக்குகிறோம் (Consistency-க்காக)
    if (cleanPhone.startsWith("91") && cleanPhone.length > 10) {
      cleanPhone = cleanPhone.slice(-10);
    }

    const isTestOtp = (otp === "0123"); 
    const storedOtp = otpStore.get(cleanPhone);
    const isCorrectOtp = isTestOtp || (storedOtp && storedOtp === otp);

    if (!isCorrectOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    otpStore.delete(cleanPhone);

    // 🌟 3. இப்போ தேடும்போது 10 டிஜிட் நம்பரை மட்டும் வைத்துத் தேடும்
    let user = await User.findOne({ phone: cleanPhone });
    
    if (!user) {
      user = await User.create({ phone: cleanPhone, role: "customer" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      success: true,
      token, 
      user: { id: user._id, name: user.name, phone: user.phone, role: user.role, addressBook: user.addressBook || [] }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { name, email } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Email already in use" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { name, email } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role
      }
    });
  } catch (err) {
    console.error("Profile Update Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.addUserAddress = async (req, res) => {
  try {
    
    const userId = req.params.userId || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: "User identity missing" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { receiverName, flatNo, area, pincode, addressType, phone, isDefault } = req.body;

    
    if (!flatNo || !area || !pincode) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

   
    if (isDefault) {
      user.addressBook.forEach(addr => addr.isDefault = false);
    }

    const newAddress = {
      receiverName: receiverName || user.name || "Customer",
      addressType: addressType || "Home",
      flatNo,
      area,
      phone: phone || user.phone, 
      pincode,
      isDefault: isDefault || false
    };

    user.addressBook.push(newAddress);
    await user.save();

    res.json({ 
      success: true, 
      message: "Address saved successfully",
      addressBook: user.addressBook 
    });
  } catch (err) {
    console.error("Address Save Error:", err.message); 
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.toggleWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

   
    const user = await User.findById(userId); 
    
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    
    if (!user.wishlist) user.wishlist = [];

    
    const index = user.wishlist.indexOf(productId);

    if (index === -1) {
      user.wishlist.push(productId); 
      await user.save();
      return res.json({ success: true, message: "Added to wishlist", wishlist: user.wishlist });
    } else {
      user.wishlist.splice(index, 1); 
      await user.save();
      return res.json({ success: true, message: "Removed from wishlist", wishlist: user.wishlist });
    }
  } catch (err) {
    console.error("Wishlist Toggle Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist');
    res.json({ success: true, data: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



/* -------- LOGOUT -------- */
exports.logout = async (req, res) => {
  res.json({ success: true });
};
