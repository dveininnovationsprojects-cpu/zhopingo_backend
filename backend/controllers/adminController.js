// const DeliveryCharge = require('../models/DeliveryCharge');
// const Admin = require('../models/Admin');
// const Seller = require("../models/Seller");
// const User = require("../models/User");
// const jwt = require("jsonwebtoken");
// const { sendReelBlockNotification } = require("../utils/emailService");
// const bcrypt = require("bcryptjs");

// const JWT_SECRET = process.env.JWT_SECRET || "secret123";
// exports.adminLogin = async (req, res) => { // இங்க 'next' போடக்கூடாது மச்சான்
//     try {
//         const { email, password } = req.body;
//         const DEFAULT_EMAIL = "admin@gmail.com";
//         const DEFAULT_PASS = "admin@123";

//         let admin = await Admin.findOne({ email });

//         // டேட்டாபேஸில் அட்மின் இல்லையென்றால் டீஃபால்ட் விவரங்களுடன் உருவாக்கும்
//         if (!admin && email === DEFAULT_EMAIL && password === DEFAULT_PASS) {
//             // Admin.js Schema-வே பாஸ்வேர்ட் ஹேஷிங்கை பார்த்துக் கொள்ளும்
//             admin = new Admin({
//                 name: "Admin da amala",
//                 email: DEFAULT_EMAIL,
//                 password: DEFAULT_PASS, 
//                 phone: "1122334455" 
//             });
//             await admin.save();
//         }

//         if (admin) {
//             const isMatch = await bcrypt.compare(password, admin.password);
//             if (!isMatch) return res.status(401).json({ success: false, message: "Invalid Password" });

//             const token = jwt.sign({ id: admin._id, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });

//             return res.json({
//                 success: true,
//                 token,
//                 user: { id: admin._id, name: admin.name, email: admin.email, role: "admin" }
//             });
//         }
//         return res.status(401).json({ success: false, message: "Invalid Credentials" });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

// exports.uploadDeliveryRates = async (req, res) => {
//   try {
//     const ratesArray = req.body; 
//     const operations = ratesArray.map(item => ({
//       updateOne: {
//         filter: { pincode: item.pincode },
//         update: { $set: { charge: item.charge } },
//         upsert: true
//       }
//     }));
//     await DeliveryCharge.bulkWrite(operations);
//     res.json({ success: true, message: "Delivery rates updated successfully" });
//   } catch (err) { res.status(500).json({ error: err.message }); }
// };


// exports.getAllSellers = async (req, res) => {
//   try {
//     const sellers = await Seller.find().sort({ createdAt: -1 });
//     res.json({ 
//       success: true, 
//       count: sellers.length,
//       data: sellers 
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };


// exports.verifySellerStatus = async (req, res) => {
//   try {
//     const { sellerId, status, reason } = req.body; 

//     const seller = await Seller.findById(sellerId);
//     if (!seller) return res.status(404).json({ message: "Seller not found" });

//     seller.kycStatus = status;
//     seller.isVerified = (status === "approved");
    
//     if (reason) seller.rejectionReason = reason;

//     await seller.save();

//     res.json({ 
//       success: true, 
//       message: `Seller has been ${status} successfully`,
//       sellerData: seller 
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// exports.getAllCustomers = async (req, res) => {
//   try {
    
//     const customers = await User.find({ role: 'customer' })
//       .select("-password") 
//       .sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       count: customers.length,
//       data: customers
//     });
//   } catch (err) {
//     res.status(500).json({ 
//       success: false, 
//       message: "can't get customer info",
//       error: err.message 
//     });
//   }
// };



// exports.toggleBrandStatus = async (req, res) => {
//     try {
//         const seller = await Seller.findById(req.params.id);
//         if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

//         seller.isBrand = !seller.isBrand; 
//         await seller.save();

//         res.json({ success: true, message: `Brand status updated to ${seller.isBrand}`, isBrand: seller.isBrand });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };


// exports.blockReelByAdmin = async (req, res) => {
//   try {
//     const { reelId, reason } = req.body;


//     const reel = await Reel.findById(reelId).populate("sellerId");
//     if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });

   
//     reel.isBlocked = true;
//     reel.blockReason = reason;
//     await reel.save();

  
//     const seller = reel.sellerId;
//     if (seller && seller.email) {
//       try {
//         await sendReelBlockNotification(seller.email, reel.description, reason);
//       } catch (mailErr) {
//         console.error("Email failed but reel blocked:", mailErr.message);
//       }
//     }

//     res.json({ success: true, message: "Reel blocked and seller notified via email" });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
// // Seller Status Toggle (Active/Inactive)
// exports.updateSellerStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body; // Frontend-ல் இருந்து 'active' அல்லது 'inactive' வரும்

//     const seller = await Seller.findById(id);
//     if (!seller) {
//       return res.status(404).json({ success: false, message: "Seller not found" });
//     }

//     seller.status = status;
//     await seller.save();

//     res.json({ 
//       success: true, 
//       message: `Seller is now ${status.toUpperCase()}`, 
//       data: seller 
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
// // 2️⃣ அட்மின் ப்ரொபைல் அப்டேட் (City, State, Country உட்பட)
// exports.updateAdminProfile = async (req, res) => {
//     try {
//         const updatedAdmin = await Admin.findByIdAndUpdate(
//             req.user.id, // protect middleware-ல் இருந்து வரும் ID
//             { $set: req.body },
//             { new: true, runValidators: true }
//         ).select("-password");

//         if (!updatedAdmin) return res.status(404).json({ success: false, message: "Admin not found" });

//         res.json({ success: true, message: "Profile Updated Successfully!", data: updatedAdmin });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

// // 3️⃣ அட்மின் ப்ரொபைல் விவரங்களை எடுக்க
// exports.getAdminProfile = async (req, res) => {
//     try {
//         const admin = await Admin.findById(req.user.id).select("-password");
//         if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
//         res.json({ success: true, data: admin });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

// // 🌟 4. பாஸ்வேர்ட் மாற்ற (Change Password - Corrected)
// exports.changeAdminPassword = async (req, res) => {
//     try {
//         const { oldPass, newPass } = req.body;
//         const admin = await Admin.findById(req.user.id);

//         if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

//         const isMatch = await bcrypt.compare(oldPass, admin.password);
//         if (!isMatch) return res.status(400).json({ success: false, message: "Old password is wrong" });

//         // Admin.js-ல் உள்ள pre-save hook பாஸ்வேர்டை ஹேஷ் செய்ய, நேரடியாக அசைன் பண்ணனும்
//         admin.password = newPass; 
//         await admin.save();

//         res.json({ success: true, message: "Password Changed Successfully!" });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };


const DeliveryCharge = require('../models/DeliveryCharge');
const Admin = require('../models/Admin');
const Seller = require("../models/Seller");
const User = require("../models/User");
const Reel = require("../models/Reel"); // Reel மாடல் தேவைப்படும்
const jwt = require("jsonwebtoken");
const { sendReelBlockNotification } = require("../utils/emailService");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

// 🌟 1. அட்மின் லாகின்
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const DEFAULT_EMAIL = "admin@gmail.com";
        const DEFAULT_PASS = "admin@123";

        let admin = await Admin.findOne({ email });

        // டேட்டாபேஸில் இல்லையென்றால் டீஃபால்ட் விவரங்களுடன் உருவாக்கும்
        if (!admin && email === DEFAULT_EMAIL && password === DEFAULT_PASS) {
            admin = new Admin({
                name: "Admin da amala",
                email: DEFAULT_EMAIL,
                password: DEFAULT_PASS, // Schema pre-save hook ஹேஷ் செய்துவிடும்
                phone: "1122334455" 
            });
            await admin.save();
        }

        if (admin) {
            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) return res.status(401).json({ success: false, message: "Invalid Password" });

            const token = jwt.sign({ id: admin._id, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });

            return res.json({
                success: true,
                token,
                user: { id: admin._id, name: admin.name, email: admin.email, role: "admin" }
            });
        }
        return res.status(401).json({ success: false, message: "Invalid Credentials" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🌟 2. அட்மின் ப்ரொபைல் அப்டேட் (City, State, Country உட்பட)
exports.updateAdminProfile = async (req, res) => {
    try {
        const updatedAdmin = await Admin.findByIdAndUpdate(
            req.user.id, 
            { $set: req.body },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedAdmin) return res.status(404).json({ success: false, message: "Admin not found" });

        res.json({ success: true, message: "Profile Updated Successfully!", data: updatedAdmin });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🌟 3. அட்மின் ப்ரொபைல் விவரங்களை எடுக்க
exports.getAdminProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id).select("-password");
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
        res.json({ success: true, data: admin });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🌟 4. பாஸ்வேர்ட் மாற்ற
exports.changeAdminPassword = async (req, res) => {
    try {
        const { oldPass, newPass } = req.body;
        const admin = await Admin.findById(req.user.id);

        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        const isMatch = await bcrypt.compare(oldPass, admin.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Old password is wrong" });

        admin.password = newPass; 
        await admin.save(); // இது Schema-வில் உள்ள pre-save hook-ஐ இயக்கும்

        res.json({ success: true, message: "Password Changed Successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 🌟 5. மற்ற அட்மின் கண்ட்ரோல்கள் (Sellers, Customers, Reels etc.)
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
        res.json({ success: true, count: sellers.length, data: sellers });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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
        res.json({ success: true, message: `Seller has been ${status} successfully`, sellerData: seller });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getAllCustomers = async (req, res) => {
    try {
        const customers = await User.find({ role: 'customer' }).select("-password").sort({ createdAt: -1 });
        res.json({ success: true, count: customers.length, data: customers });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.updateSellerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const seller = await Seller.findByIdAndUpdate(id, { status }, { new: true });
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });
        res.json({ success: true, message: `Seller is now ${status.toUpperCase()}`, data: seller });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.toggleBrandStatus = async (req, res) => {
    try {
        const seller = await Seller.findById(req.params.id);
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });
        seller.isBrand = !seller.isBrand; 
        await seller.save();
        res.json({ success: true, message: `Brand status updated to ${seller.isBrand}`, isBrand: seller.isBrand });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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
            try { await sendReelBlockNotification(seller.email, reel.description, reason); } 
            catch (mailErr) { console.error("Email failed:", mailErr.message); }
        }
        res.json({ success: true, message: "Reel blocked and seller notified" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};