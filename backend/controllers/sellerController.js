const Seller = require("../models/Seller");
const Order = require("../models/Order");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendAdminNotification } = require("../utils/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "secret123";
exports.registerSeller = async (req, res) => {
  try {
    const { name, email, password, shopName, phone } = req.body;

    // 🌟 Email, Password மற்றும் ShopName கட்டாயம்
    if (!name || !email || !password || !shopName) {
      return res.status(400).json({ success: false, message: "Email and required fields missing" });
    }
    
    // 🌟 மின்னஞ்சல் ஏற்கனவே உள்ளதா எனச் சரிபார்த்தல் (Unique Email)
    const existing = await Seller.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const seller = await Seller.create({
      name, 
      email, // 🌟 இப்போது இதுதான் Primary ID
      phone, // 🌟 போன் நம்பர் Unique அல்ல
      password: hashedPassword,
      shopName,
      kycStatus: "not_submitted",
      isVerified: false
    });

    try {
      await sendAdminNotification(seller, "Registration");
    } catch (mailErr) {
      console.error("Admin Email Failed:", mailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful using Email. Proceed to KYC.",
      sellerId: seller._id
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ================= 2. UPLOAD KYC (Using Email to find Seller) ================= */
exports.uploadKyc = async (req, res) => {
  try {
    const { email, panNumber, gstNumber, fssaiNumber, msmeNumber } = req.body;
    
    // 🌟 மின்னஞ்சல் மூலம் செல்லரைக் கண்டுபிடித்தல்
    const seller = await Seller.findOne({ email });

    if (!seller) return res.status(404).json({ success: false, message: "Seller with this email not found" });

    // 🌟 PAN மற்றும் GST ஆவணங்கள் + எண்கள் கட்டாயம்
    if (!panNumber || !gstNumber || !req.files?.pan_doc || !req.files?.gst_doc) {
      return res.status(400).json({ success: false, message: "PAN and GST documents/numbers are required" });
    }

    seller.panNumber = panNumber;
    seller.gstNumber = gstNumber;
    if (fssaiNumber) seller.fssaiNumber = fssaiNumber;
    if (msmeNumber) seller.msmeNumber = msmeNumber;

    // 🌟 கட்டாய ஆவணப் பதிவேற்றம்
    if (req.files.pan_doc) {
      seller.kycDocuments.panDoc = {
        fileName: req.files.pan_doc[0].filename,
        fileUrl: `uploads/kyc/${req.files.pan_doc[0].filename}`
      };
    }
    if (req.files.gst_doc) {
      seller.kycDocuments.gstDoc = {
        fileName: req.files.gst_doc[0].filename,
        fileUrl: `uploads/kyc/${req.files.gst_doc[0].filename}`
      };
    }

    seller.kycStatus = "pending";
    await seller.save();

    await sendAdminNotification(seller, "KYC Submission");

    res.json({ success: true, message: "KYC submitted. Admin will verify shortly." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ================= 3. SELLER LOGIN (Email & Password Only) ================= */
exports.loginSeller = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 🌟 மின்னஞ்சல் மூலம் லாகின் சரிபார்த்தல்
    const seller = await Seller.findOne({ email });

    if (!seller) return res.status(404).json({ success: false, message: "Email not found" });

    // 🌟 அட்மின் அப்ரூவல் செக்
    if (!seller.isVerified) {
      return res.status(403).json({ 
        success: false, 
        message: `Verification Pending. Current Status: ${seller.kycStatus}` 
      });
    }

    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid password" });

    const token = jwt.sign({ id: seller._id, role: "seller" }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      seller: { id: seller._id, name: seller.name, email: seller.email, shopName: seller.shopName }
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