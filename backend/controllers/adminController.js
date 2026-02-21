const DeliveryCharge = require('../models/DeliveryCharge');
const Seller = require("../models/Seller");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendReelBlockNotification } = require("../utils/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "secret123";


exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    
    const DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
    const DEFAULT_ADMIN_PASS = "admin@123";

    if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASS) {
     
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
    res.json({ 
      success: true, 
      count: sellers.length,
      data: sellers 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.verifySellerStatus = async (req, res) => {
  try {
    const { sellerId, status, reason } = req.body; 

    const seller = await Seller.findById(sellerId);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    seller.kycStatus = status;
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
    
    const customers = await User.find({ role: 'customer' })
      .select("-password") 
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "can't get customer info",
      error: err.message 
    });
  }
};



exports.toggleBrandStatus = async (req, res) => {
    try {
        const seller = await Seller.findById(req.params.id);
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

        seller.isBrand = !seller.isBrand; 
        await seller.save();

        res.json({ success: true, message: `Brand status updated to ${seller.isBrand}`, isBrand: seller.isBrand });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.blockReelByAdmin = async (req, res) => {
  try {
    const { reelId, reason } = req.body;


    const reel = await Reel.findById(reelId).populate("sellerId");
    if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });

   
    reel.isBlocked = true;
    reel.blockReason = reason;
    await reel.save();

  
    const seller = reel.sellerId;
    if (seller && seller.email) {
      try {
        await sendReelBlockNotification(seller.email, reel.description, reason);
      } catch (mailErr) {
        console.error("Email failed but reel blocked:", mailErr.message);
      }
    }

    res.json({ success: true, message: "Reel blocked and seller notified via email" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
// Seller Status Toggle (Active/Inactive)
exports.updateSellerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Frontend-ல் இருந்து 'active' அல்லது 'inactive' வரும்

    const seller = await Seller.findById(id);
    if (!seller) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    seller.status = status;
    await seller.save();

    res.json({ 
      success: true, 
      message: `Seller is now ${status.toUpperCase()}`, 
      data: seller 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
// 1. அட்மின் ப்ரொபைல் விவரங்களை டேட்டாபேஸில் இருந்து எடுக்க
exports.getAdminProfile = async (req, res) => {
    try {
        // அட்மின் மின்னஞ்சலை வைத்து தேடுகிறோம்
        let admin = await User.findOne({ role: 'admin' }).select("-password");

        // ஒருவேளை டேட்டாபேஸில் அட்மின் இல்லை என்றால், நீ கேட்ட அந்த Default டேட்டாவை உருவாக்கும்
        if (!admin) {
            admin = {
                name: "Admin da amala", 
                email: "admin@gmail.com",
                phone: "000000",
                city: "Chennai",
                state: "Tamil Nadu",
                country: "India",
                role: "admin"
            };
        }

        res.json({ success: true, data: admin });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. அட்மின் ப்ரொபைல் அப்டேட் செய்ய (Real Database Update)
exports.updateAdminProfile = async (req, res) => {
    try {
        const updateData = req.body;

        // அட்மின் ப்ரொபைலை கண்டுபிடித்து அப்டேட் செய்கிறோம்
        const updatedAdmin = await User.findOneAndUpdate(
            { role: 'admin' }, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedAdmin) {
            return res.status(404).json({ success: false, message: "Admin account not found in database" });
        }

        res.json({ 
            success: true, 
            message: "Profile updated successfully!",
            data: updatedAdmin 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. பாஸ்வேர்ட் மாற்ற (With Proper Security)
exports.changeAdminPassword = async (req, res) => {
    try {
        const { oldPass, newPass } = req.body;

        // 1. அட்மினை கண்டுபிடிக்கவும்
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        // 2. பழைய பாஸ்வேர்ட் சரியா என பார்க்கவும்
        const isMatch = await bcrypt.compare(oldPass, admin.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Old password is incorrect" });

        // 3. புதிய பாஸ்வேர்டை ஹேஷ் (Hash) செய்து சேமிக்கவும்
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(newPass, salt);
        await admin.save();

        res.json({ success: true, message: "Password updated successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Password update failed", error: err.message });
    }
};