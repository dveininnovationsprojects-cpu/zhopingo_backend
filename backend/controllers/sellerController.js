const Seller = require("../models/Seller");
const Order = require("../models/Order");
const Payout = require("../models/Payout");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Settlement = require("../models/Settlement");
const { sendAdminNotification } = require("../utils/emailService");
const mongoose = require("mongoose");

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
    
    const seller = await Seller.findOne({ email });
    if (!seller) return res.status(404).json({ success: false, message: "Seller with this email not found" });

    if (!panNumber || !gstNumber) {
      return res.status(400).json({ success: false, message: "PAN and GST numbers are required" });
    }

    seller.panNumber = panNumber;
    seller.gstNumber = gstNumber;
    if (fssaiNumber) seller.fssaiNumber = fssaiNumber;
    if (msmeNumber) seller.msmeNumber = msmeNumber;

    // 🌟 THE FIX: Accessing S3 'key' instead of just filename
    // S3 storage use pannumbothu file info 'key' field-la dhaan irukkum
    if (req.files) {
        if (req.files.pan_doc) {
            seller.kycDocuments.panDoc = { 
                fileName: req.files.pan_doc[0].key.split('/').pop(), 
                fileUrl: req.files.pan_doc[0].key 
            };
        }
        if (req.files.gst_doc) {
            seller.kycDocuments.gstDoc = { 
                fileName: req.files.gst_doc[0].key.split('/').pop(), 
                fileUrl: req.files.gst_doc[0].key 
            };
        }
        if (req.files.msme_doc) {
            seller.kycDocuments.msmeDoc = { 
                fileName: req.files.msme_doc[0].key.split('/').pop(), 
                fileUrl: req.files.msme_doc[0].key 
            };
        }
        if (req.files.fssai_doc) {
            seller.kycDocuments.fssaiDoc = { 
                fileName: req.files.fssai_doc[0].key.split('/').pop(), 
                fileUrl: req.files.fssai_doc[0].key 
            };
        }
    }

    seller.kycStatus = "pending";
    await seller.save();

    res.json({ success: true, message: "KYC submitted successfully! Admin will verify. ✅" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

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
    const { id } = req.params;
    const sellerObjectId = new mongoose.Types.ObjectId(id);
    
    // 1. Seller Details Fetch
    const seller = await Seller.findById(id).select("-password");
    if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

    // 2. Orders Statistics (Live counts strictly from Order collection)
    const orderStats = await Order.aggregate([
      { $match: { "sellerSplitData.sellerId": sellerObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const stats = { Placed: 0, Shipped: 0, Delivered: 0, Cancelled: 0, Pending: 0, Returned: 0 };
    orderStats.forEach(s => { if (s._id) stats[s._id] = s.count; });

    // 🌟 3. REVENUE LOGIC: Strictly from Finalized Settlements 🌟
    // Admin generate panna 'Settlement' collection-la 'Paid' status-la irukkura amount-ah mattum kooturom
    const paidRevenue = await Settlement.aggregate([
      { 
        $match: { 
          sellerId: sellerObjectId, 
          status: "Paid" 
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$finalPayable" } // Weekly grand total generator-la vara final amount
        }
      }
    ]);

    // Sum calculation with safety check
    const totalRevenue = paidRevenue.length > 0 ? paidRevenue[0].total : 0;

    res.json({
      success: true,
      data: {
        seller,
        stats,
        revenue: totalRevenue.toFixed(2), // 💰 Weekly generate aana amount mattum dhaan inga varum
        newOrdersCount: stats.Placed || 0
      }
    });

  } catch (err) {
    console.error("Dashboard Simplified Sync Error:", err.message);
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
// 🌟 1. Seller & Admin View/Update KYC Documents
exports.getAndUpdateMyKyc = async (req, res) => {
    try {
        const sellerId = req.query.id || req.body.sellerId || req.params.id;
        const CF_URL = process.env.CLOUDFRONT_URL; // 🚀 Using same env as product helper

        if (!sellerId) {
            return res.status(400).json({ success: false, message: "Seller ID is missing." });
        }

        const seller = await Seller.findById(sellerId);
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

        // 🚀 SYNC WITH PRODUCT LOGIC: Formatting Docs with CloudFront URL
        const formattedDocs = {};
        if (seller.kycDocuments) {
            const docKeys = ['panDoc', 'gstDoc', 'fssaiDoc', 'msmeDoc'];
            
            docKeys.forEach(key => {
                const doc = seller.kycDocuments[key];
                if (doc && doc.fileUrl) {
                    formattedDocs[key] = {
                        ...doc.toObject(),
                        // 🌟 Same Logic as Product Media Helper
                        fullUrl: doc.fileUrl.startsWith("http") ? doc.fileUrl : CF_URL + doc.fileUrl
                    };
                }
            });
        }

        // logic A: GET Method (Just for View)
        if (req.method === "GET") {
            return res.json({ 
                success: true, 
                data: {
                    shopName: seller.shopName,
                    kycStatus: seller.kycStatus,
                    panNumber: seller.panNumber,
                    gstNumber: seller.gstNumber,
                    fssaiNumber: seller.fssaiNumber,
                    msmeNumber: seller.msmeNumber,
                    kycDocuments: formattedDocs // 🔥 Ippo fullUrl katchithama varum
                }
            });
        }

        // logic B: PUT/POST Method (For Update)
        const { panNumber, gstNumber, fssaiNumber, msmeNumber } = req.body;

        if (panNumber) seller.panNumber = panNumber;
        if (gstNumber) seller.gstNumber = gstNumber;
        if (fssaiNumber) seller.fssaiNumber = fssaiNumber;
        if (msmeNumber) seller.msmeNumber = msmeNumber;

        if (req.files) {
            // Un multerConfig-la 'pan_doc', 'gst_doc' dhaan folder path keys
            if (req.files.pan_doc) seller.kycDocuments.panDoc = { fileName: req.files.pan_doc[0].key.split('/').pop(), fileUrl: req.files.pan_doc[0].key };
            if (req.files.gst_doc) seller.kycDocuments.gstDoc = { fileName: req.files.gst_doc[0].key.split('/').pop(), fileUrl: req.files.gst_doc[0].key };
            if (req.files.fssai_doc) seller.kycDocuments.fssaiDoc = { fileName: req.files.fssai_doc[0].key.split('/').pop(), fileUrl: req.files.fssai_doc[0].key };
            if (req.files.msme_doc) seller.kycDocuments.msmeDoc = { fileName: req.files.msme_doc[0].key.split('/').pop(), fileUrl: req.files.msme_doc[0].key };
        }

        seller.kycStatus = "pending";
        await seller.save();

        res.json({ success: true, message: "KYC Documents updated!", data: seller.kycDocuments });

    } catch (err) {
        console.error("KYC Logic Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};
// 🌟 THE UNBREAKABLE FIX: Positional Operator for Nested Date
exports.updateSellerOrderStatus = async (req, res) => {
  try {
    const { orderId, sellerId, status } = req.body;
    
    if (!orderId || !sellerId || !status) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const now = new Date();
    
    // 🚀 THE ATOMIC UPDATE: positional operator ($) targets the specific seller in array
    // Filter criteria-la sellerId and orderId renduமே strictly match aaganum
    const updateQuery = { 
        _id: new mongoose.Types.ObjectId(orderId), 
        "sellerSplitData.sellerId": new mongoose.Types.ObjectId(sellerId) 
    };

    const updateData = { 
        $set: { 
            "sellerSplitData.$.packageStatus": status,
            "status": status // Overall order status update
        } 
    };

    // Date logical switch
    if (status === 'Delivered') {
        updateData.$set["sellerSplitData.$.deliveredDate"] = now;
    } else if (status === 'Returned') {
        updateData.$set["sellerSplitData.$.returnDate"] = now;
    }

    const updatedOrder = await Order.findOneAndUpdate(
      updateQuery,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
        return res.status(404).json({ 
            success: false, 
            message: "Order or Seller ID mismatch in Database. Check IDs strictly." 
        });
    }

    res.json({ 
      success: true, 
      message: `Status & Date Updated Successfully! ✅`, 
      data: updatedOrder 
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



exports.logoutSeller = async (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
};


exports.getProductsBySeller = async (req, res) => {
    try {
        const { sellerId } = req.params;
        
        
        const products = await Product.find({ seller: sellerId })
            .populate("category")
            .sort({ createdAt: -1 }); 

        res.json({ 
            success: true, 
            count: products.length,
            data: products 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
/* ================= UPDATE SELLER PROFILE ================= */
exports.updateSellerProfile = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // 🌟 S3 Fix: Frontend uses shopLogo, so we map req.file.key to both
        if (req.file) {
            updateData.shopLogo = req.file.key; 
            updateData.profileImage = req.file.key; 
        }

        const seller = await Seller.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).select("-password");

        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

        res.json({ success: true, data: seller });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
};


exports.getProductsBySeller = async (req, res) => {
    try {
        const { sellerId } = req.params;
        
        // 1. First, Seller details-ai edukkom (Logo path idhula dhaan irukku)
        const sellerInfo = await Seller.findById(sellerId).select("shopName profileImage shopLogo");

        // 2. Aprom andha seller-oda products-ai edukkom
        const products = await mongoose.model("Product").find({ seller: sellerId })
            .populate("category")
            .sort({ createdAt: -1 });

        // 🌟 response-la 'seller' object-aiyum sethu anuppalam
        res.json({ 
            success: true, 
            count: products.length,
            seller: sellerInfo, // 🔥 Idhu dhaan missing!
            data: products 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getAllBrands = async (req, res) => {
    try {
        // 🌟 THE FIX: 'shopLogo' field-aiyum sethu select pannanum
        // Appo thaan frontend-la Image source={uri: ...shopLogo} work aagum
        const brands = await Seller.find({ isBrand: true })
            .select("shopName shopLogo profileImage name")
            .lean(); // Lean use panna query innum fast-ah irukkum
        
        res.json({ 
            success: true, 
            count: brands.length,
            data: brands 
        });
    } catch (err) {
        console.error("GET ALL BRANDS ERROR:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.toggleSellerBrandStatus = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const { isBrand } = req.body; 

        const seller = await Seller.findByIdAndUpdate(
            sellerId,
            { isBrand: isBrand },
            { new: true }
        ).select("shopName isBrand");

        if (!seller) {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }

        res.json({ 
            success: true, 
            message: seller.isBrand ? "Seller promoted to Top Brand ✅" : "Seller removed from Brands ❌",
            data: seller 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateSellerAdminStatus = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const { status } = req.body; // active / inactive

        const seller = await Seller.findByIdAndUpdate(
            sellerId,
            { status },
            { new: true }
        );

        res.json({ success: true, data: seller });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


// controllers/sellerController.js
exports.addSellerAddress = async (req, res) => {
  try {
    const sellerId = req.params.id || req.user?.id;
    if (!sellerId) return res.status(400).json({ success: false, message: "Seller identity missing" });

    const { receiverName, flatNo, area, pincode, phone, addressType } = req.body;

    // 🌟 Check mandatory fields for Delhivery
    if (!flatNo || !area || !pincode) {
      return res.status(400).json({ success: false, message: "Pickup pincode and address are required" });
    }

    const updatedSeller = await Seller.findByIdAndUpdate(
      sellerId,
      {
        $set: {
          shopAddress: {
            receiverName: receiverName || "Seller Pickup Point",
            flatNo,
            area,
            pincode,
            phone,
            addressType: addressType || "Shop"
          }
        }
      },
      { new: true }
    );

    if (!updatedSeller) return res.status(404).json({ success: false, message: "Seller not found" });

    res.json({ 
      success: true, 
      message: "Pickup address saved successfully for shipping",
      data: updatedSeller.shopAddress 
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};