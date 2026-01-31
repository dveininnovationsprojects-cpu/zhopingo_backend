const User = require('../models/User');
const Seller = require('../models/Seller');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Meta API Credentials
const WHATSAPP_TOKEN = "EAAg0qwYRJyMBQUgdLZBncqFf3HZAFK9h2Wwc7ZCXzHKxkHt5i5MFqpEtzSEj2V38eBnSiqr7aLzhympifIfkSSEnWiUYZBvjrcxp9LnFG8STF5bUjboGqONxKkzoGf5In47VzL5hxmiLSHIgZA6nY1C2qGAJbhIIhrJNW54qAZCNdIFDdcGq770WaDadVcUkbxJwZDZD";
const PHONE_NUMBER_ID = "925143760687585";

// In-memory store (Use Redis for production)
const otpStore = new Map();

// --- CUSTOMER WHATSAPP LOGIN FLOW ---

exports.sendOTP = async (req, res) => {
    try {
        const { phone } = req.body; 
        const cleanPhone = phone.startsWith('+') ? phone.substring(1) : phone;

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
                    language: { code: "en" }, // CHANGED from en_US to en
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: otp } 
                            ]
                        },
                        {
                            type: "button",
                            sub_type: "url",
                            index: "0",
                            parameters: [
                                { type: "text", text: otp } 
                            ]
                        }
                    ]
                }
            },
            {
                headers: { 
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json' 
                }
            }
        );

        res.json({ success: true, message: "OTP sent via WhatsApp" });
    } catch (err) {
        // Log the detailed error to see if language or template mismatch persists
        console.error("WhatsApp API Error Details:", JSON.stringify(err.response?.data, null, 2));
        res.status(500).json({ success: false, error: err.response?.data || "Failed to send WhatsApp message" });
    }
};
// STEP 2: VERIFY OTP AND LOGIN
exports.loginWithOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        const storedOtp = otpStore.get(phone);

        // Allow master test code or verify stored code
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
            process.env.JWT_SECRET || 'zhopingo_secret', 
            { expiresIn: '7d' }
        );

        // Send token and user data for Redux setCredentials
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

// --- PROFILE & ACCOUNT MANAGEMENT ---

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server Error" });
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
    } catch (err) {
        res.status(400).json({ success: false, error: "Update failed" });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: "Logged out successfully" });
};

// --- SELLER MANAGEMENT ---

exports.registerSeller = async (req, res) => {
    try {
        const { name, email, password, shopName, phone } = req.body;
        let seller = await Seller.findOne({ $or: [{ email }, { phone }] });
        if (seller) return res.status(400).json({ success: false, message: "Seller already exists" });

        seller = new Seller({ name, email, password, shopName, phone });
        await seller.save();

        res.status(201).json({ success: true, message: "Seller registered", sellerId: seller._id });
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

        const token = jwt.sign({ id: seller._id, role: 'seller' }, process.env.JWT_SECRET || 'zhopingo_secret', { expiresIn: '7d' });

        res.json({ success: true, token, seller: { id: seller._id, shopName: seller.shopName } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// --- ADDRESS MANAGEMENT ---

exports.addUserAddress = async (req, res) => {
    try {
        const { userId } = req.params;
        const { label, addressLine, city, state, pincode } = req.body;

        const newAddress = {
            label: label || "Home",
            addressLine,
            city,
            state,
            pincode,
            isDefault: false
        };

        const user = await User.findByIdAndUpdate(
            userId,
            { $push: { addressBook: newAddress } }, // Push to User addressBook array
            { new: true }
        );

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        res.status(200).json({ success: true, addressBook: user.addressBook });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};