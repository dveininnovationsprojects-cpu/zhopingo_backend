const Seller = require("../models/Seller");
const Order = require("../models/Order");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendAdminNotification } = require("../utils/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

/* ================= 1. REGISTER SELLER ================= */
exports.registerSeller = async (req, res) => {
  try {
    const { name, phone, email, password, shopName } = req.body;

    if (!name || !phone || !password || !shopName) {
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
      shopName,
      kycStatus: "not_submitted",
      isVerified: false
    });

    
    try {
      await sendAdminNotification(seller, "Registration");
    } catch (mailErr) {
      console.error("Admin Notification Mail Failed:", mailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Seller registered successfully. Please upload KYC.",
      sellerId: seller._id
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ================= 2. UPLOAD KYC DOCUMENTS (PAN & GST Required) ================= */
exports.uploadKyc = async (req, res) => {
  try {
    const { phone, panNumber, gstNumber, fssaiNumber, msmeNumber } = req.body;
    const seller = await Seller.findOne({ phone });

    if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

    
    if (!panNumber || !gstNumber) {
      return res.status(400).json({ success: false, message: "PAN and GST numbers are mandatory" });
    }

    seller.panNumber = panNumber;
    seller.gstNumber = gstNumber;
    if (fssaiNumber) seller.fssaiNumber = fssaiNumber;
    if (msmeNumber) seller.msmeNumber = msmeNumber;

   
    const docs = ["pan_doc", "gst_doc", "fssai_doc", "msme_doc"];
    docs.forEach(doc => {
      if (req.files && req.files[doc]) {
        const fieldName = doc.replace('_doc', 'Doc');
        seller.kycDocuments[fieldName] = {
          fileName: req.files[doc][0].filename,
          fileUrl: `uploads/kyc/${req.files[doc][0].filename}`,
          mimeType: req.files[doc][0].mimetype
        };
      }
    });

    seller.kycStatus = "pending";
    await seller.save();

    
    await sendAdminNotification(seller, "KYC Submission");

    res.json({ success: true, message: "KYC documents uploaded and sent for approval" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ================= 3. SELLER LOGIN (Only if Admin Verified) ================= */
exports.loginSeller = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const seller = await Seller.findOne({ phone });

    if (!seller) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    
    if (!seller.isVerified) {
      return res.status(403).json({ 
        success: false, 
        message: `Login denied. Account status: ${seller.kycStatus}. Wait for Admin approval.` 
      });
    }

    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: seller._id, role: "seller" }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      seller: { 
        id: seller._id, 
        name: seller.name, 
        shopName: seller.shopName, 
        kycStatus: seller.kycStatus 
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



exports.getSellerDashboard = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id).select("-password");
    if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });
    res.json({ success: true, data: seller });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


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


exports.updateSellerOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body; 
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, message: `Order marked as ${status}`, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.logoutSeller = async (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
};