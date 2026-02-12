const DeliveryCharge = require('../models/DeliveryCharge');
const Seller = require("../models/Seller");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

// 🌟 அட்மின் லாகின் - நிலையான விவரங்கள் (Fixed Credentials)
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // நிலையான அட்மின் விவரங்களைச் சரிபார்த்தல்
    const DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
    const DEFAULT_ADMIN_PASS = "admin@123";

    if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASS) {
      // டோக்கன் உருவாக்குதல்
      const token = jwt.sign(
        { id: "static_admin_id", role: "admin" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        token,
        user: { email: DEFAULT_ADMIN_EMAIL, role: "admin" }
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid Admin Credentials" 
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// டெலிவரி கட்டணங்களைப் பதிவேற்றுதல்
exports.uploadDeliveryRates = async (req, res) => {
  try {
    const ratesArray = req.body; 
    const operations = ratesArray.map(item => ({
      updateOne: {
        filter: { pincode: item.pincode },
        update: { $set: { charge: item.charge } },
        upsert: true
      }
    }));
    await DeliveryCharge.bulkWrite(operations);
    res.json({ success: true, message: "Delivery rates updated successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// அனைத்து செல்லர்களையும் பெறுதல்
exports.getAllSellers = async (req, res) => {
  try {
    const sellers = await Seller.find().sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      count: sellers.length,
      data: sellers 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// செல்லர் KYC நிலையைச் சரிபார்த்தல் (Approved/Rejected)
exports.verifySellerStatus = async (req, res) => {
  try {
    const { sellerId, status, reason } = req.body; 

    const seller = await Seller.findById(sellerId);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    seller.kycStatus = status; // "approved" or "rejected"
    seller.isVerified = (status === "approved");
    
    if (reason) seller.rejectionReason = reason;

    await seller.save();

    res.json({ 
      success: true, 
      message: `Seller has been ${status} successfully`,
      sellerData: seller 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    // Role 'customer' ஆக இருப்பவர்களை மட்டும் எடுத்து வருதல்
    const customers = await User.find({ role: 'customer' })
      .select("-password") // பாஸ்வேர்டு விவரங்களை மறைத்தல் (Security)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: customers.length, // மொத்த வாடிக்கையாளர்களின் எண்ணிக்கை
      data: customers
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "வாடிக்கையாளர் விவரங்களைப் பெறுவதில் தோல்வி",
      error: err.message 
    });
  }
};