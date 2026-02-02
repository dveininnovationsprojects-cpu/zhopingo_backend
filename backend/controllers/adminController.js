const DeliveryCharge = require('../models/DeliveryCharge');
const Seller = require("../models/Seller");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); // 🌟 பிழை சரி செய்யப்பட்டது

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. மின்னஞ்சல் மூலம் அட்மினைத் தேடுதல்
    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Admin not found or access denied" });
    }

    // 2. பாஸ்வேர்டு சரிபார்த்தல் (bcrypt பயன்படுத்தி)
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // 3. டோக்கன் உருவாக்குதல்
    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: { id: admin._id, email: admin.email, role: "admin" }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

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

exports.getAllSellers = async (req, res) => {
  try {
    const sellers = await Seller.find().sort({ createdAt: -1 });
    res.json({ success: true, data: sellers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.verifySellerStatus = async (req, res) => {
  try {
    const { sellerId, status, reason } = req.body; 
    const seller = await Seller.findById(sellerId);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    seller.kycStatus = status; // "approved" or "rejected"
    seller.isVerified = (status === "approved");
    if (reason) seller.rejectionReason = reason;

    await seller.save();
    res.json({ success: true, message: `Seller has been ${status} successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};