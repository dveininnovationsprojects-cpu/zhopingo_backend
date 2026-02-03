const Seller = require("../models/Seller");
const Order = require("../models/Order");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendAdminNotification } = require("../utils/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

/* ================= 1. REGISTER SELLER ================= */
exports.registerSeller = async (req, res) => {
  try {
    const { name, phone, email, password, shopName, panNumber, gstNumber, fssaiNumber } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }
    
    const existing = await Seller.findOne({ phone });
    if (existing) {
      return res.status(400).json({ success: false, message: "Seller already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const seller = await Seller.create({
      name, phone, email,
      password: hashedPassword,
      shopName, panNumber, gstNumber, fssaiNumber,
      kycStatus: "not_submitted",
      isVerified: false
    });

    try {
      await sendAdminNotification(seller);
    } catch (mailErr) {
      console.error("Admin Notification Mail Failed:", mailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Seller registered successfully.",
      sellerId: seller._id
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ================= 2. UPLOAD KYC DOCUMENTS ================= */
exports.uploadKyc = async (req, res) => {
  try {
    const { phone, panNumber, gstNumber, fssaiNumber } = req.body;
    const seller = await Seller.findOne({ phone });

    if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

    if (panNumber) seller.panNumber = panNumber;
    if (gstNumber) seller.gstNumber = gstNumber;
    if (fssaiNumber) seller.fssaiNumber = fssaiNumber;

    if (req.files?.pan_doc) {
      seller.kycDocuments.panDoc = {
        fileName: req.files.pan_doc[0].filename,
        fileUrl: `uploads/kyc/pan/${req.files.pan_doc[0].filename}`,
        mimeType: req.files.pan_doc[0].mimetype
      };
    }
    // ... logic for gst_doc, fssai_doc, msme_doc follows same pattern

    seller.kycStatus = "pending";
    await seller.save();

    res.json({ success: true, message: "KYC uploaded successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ================= 3. SELLER LOGIN & DASHBOARD ================= */
exports.loginSeller = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const seller = await Seller.findOne({ phone });

    if (!seller || !(await bcrypt.compare(password, seller.password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: seller._id, role: "seller" }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      seller: { id: seller._id, name: seller.name, shopName: seller.shopName, kycStatus: seller.kycStatus, isVerified: seller.isVerified }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🌟 Added this to fix your "handler must be a function" error
exports.getSellerDashboard = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });
    res.json({ success: true, data: seller });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ================= 4. ORDER MANAGEMENT (Three Button Concept) ================= */

/**
 * NEW ORDERS (Placed)
 * Fetches orders that are "Placed" for this specific seller.
 */
exports.getSellerNewOrders = async (req, res) => {
  try {
    const orders = await Order.find({ 
      "sellerSplitData.sellerId": req.params.sellerId,
      status: "Placed" 
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * SHIPPED & DELIVERED ACTIONS
 * Updates the order status based on button clicked.
 */
exports.updateSellerOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body; // status: 'Shipped' or 'Delivered'
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, message: `Order marked as ${status}`, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ================= 5. LOGOUT ================= */
exports.logoutSeller = async (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
};