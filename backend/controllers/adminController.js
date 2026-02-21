const DeliveryCharge = require('../models/DeliveryCharge');
const Seller = require("../models/Seller");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendReelBlockNotification } = require("../utils/emailService");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || "secret123";
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const DEFAULT_EMAIL = "admin@gmail.com";
        const DEFAULT_PASS = "admin@123";

        if (email === DEFAULT_EMAIL && password === DEFAULT_PASS) {
            // 1. அட்மின் இருக்காரான்னு பாரு
            let admin = await User.findOne({ role: 'admin' });

            if (!admin) {
                // 2. ஒருவேளை அதே போன் நம்பர்ல கஸ்டமர் இருந்தா, அந்த 'unique' எர்ரரை தவிர்க்க
                // தற்காலிகமா அட்மினுக்கு வேற ஒரு நம்பர் கொடுத்துட்டு, அப்புறம் நீ ப்ரொபைல்ல மாத்திக்கலாம்.
                // அல்லது, டேட்டாபேஸ்ல 'Admin'னு ஒருத்தரை மட்டும் மேனுவலா கிரியேட் பண்ணிடு.
                
                admin = new User({
                    name: "Admin da amala",
                    email: DEFAULT_EMAIL,
                    password: DEFAULT_PASS,
                    role: "admin",
                    phone: "0000000000" // 👈 இத முதல்ல குடு, அப்புறம் அப்டேட் பண்ணிக்கலாம்
                });
                await admin.save();
            }

            const token = jwt.sign(
                { id: admin._id, role: "admin" },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.json({
                success: true,
                token,
                user: admin
            });
        }
        return res.status(401).json({ success: false, message: "Invalid Admin" });
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
// 🌟 அட்மின் ப்ரொபைல் அப்டேட் (இங்க தான் நீ கேட்ட City, State வரும்)
exports.updateAdminProfile = async (req, res) => {
    try {
        const adminId = req.user.id;
        const updatedAdmin = await User.findByIdAndUpdate(
            adminId,
            { $set: req.body }, // இங்க நீ City, State, Country எது அனுப்பினாலும் அப்டேட் ஆகும்
            { new: true, runValidators: true }
        ).select("-password");

        res.json({ success: true, message: "Profile Updated!", data: updatedAdmin });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
// 3️⃣ அட்மின் ப்ரொபைல் விவரங்களை எடுக்க
exports.getAdminProfile = async (req, res) => {
    try {
        const admin = await User.findById(req.user.id).select("-password");
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
        res.json({ success: true, data: admin });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2️⃣ பாஸ்வேர்ட் மாற்ற (Secured & Fixed)
exports.changeAdminPassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body; 
        
        // 1. அட்மினைத் தேடு
        const admin = await User.findById(req.user.id);
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        // 2. பழைய பாஸ்வேர்ட் மேட்ச் ஆகிறதா எனப் பார்
        const isMatch = await bcrypt.compare(oldPassword, admin.password);
        
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Old password is wrong" });
        }

        // 3. புதிய பாஸ்வேர்டை அப்படியே அசைன் பண்ணு. 
        // User.js-ல் உள்ள pre-save hook இதைத் தானாக ஹேஷ் செய்து சேமிக்கும்.
        admin.password = newPassword; 
        await admin.save();

        res.json({ success: true, message: "Password Changed Successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};