const Seller = require("../models/Seller");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

/* ================= REGISTER SELLER ================= */
/* OTP verify mudincha apram details + password */
// exports.registerSeller = async (req, res) => {
//   try {
//     const {
//       name,
//       phone,
//       email,
//       password,
//       shopName,
//       panNumber,
//       gstNumber,
//       fssaiNumber
//     } = req.body;

//     if (!name || !phone || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Required fields missing"
//       });
//     }

//     const existing = await Seller.findOne({ phone });
//     if (existing) {
//       return res.status(400).json({
//         success: false,
//         message: "Seller already exists"
//       });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const seller = await Seller.create({
//       name,
//       phone,
//       email,
//       password: hashedPassword,
//       shopName,
//       panNumber,
//       gstNumber,
//       fssaiNumber,
//       kycStatus: "not_submitted",
//       isVerified: false
//     });

//     res.status(201).json({
//       success: true,
//       message: "Seller registered successfully",
//       sellerId: seller._id
//     });
//     await sendAdminNotification(seller);

//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       error: err.message
//     });
//   }
// };



/* ================= REGISTER SELLER ================= */
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
      if (typeof sendAdminNotification === 'function') {
        await sendAdminNotification(seller);
      }
    } catch (mailErr) {
      console.error("Admin Notification Mail Failed:", mailErr.message);
      
    }

   
    return res.status(201).json({
      success: true,
      message: "Seller registered successfully",
      sellerId: seller._id
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};



/* ================= UPLOAD KYC DOCUMENTS ================= */
/* Files only – PAN / GST / FSSAI / MSME */
exports.uploadKyc = async (req, res) => {
  try {
    const { phone } = req.body;

    const seller = await Seller.findOne({ phone });
    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    if (req.files?.pan_doc) {
      seller.kycDocuments.panDoc = {
        fileName: req.files.pan_doc[0].filename,
        fileUrl: req.files.pan_doc[0].path,
        mimeType: req.files.pan_doc[0].mimetype
      };
    }

    if (req.files?.gst_doc) {
      seller.kycDocuments.gstDoc = {
        fileName: req.files.gst_doc[0].filename,
        fileUrl: req.files.gst_doc[0].path,
        mimeType: req.files.gst_doc[0].mimetype
      };
    }

    if (req.files?.fssai_doc) {
      seller.kycDocuments.fssaiDoc = {
        fileName: req.files.fssai_doc[0].filename,
        fileUrl: req.files.fssai_doc[0].path,
        mimeType: req.files.fssai_doc[0].mimetype
      };
    }

    if (req.files?.msme_doc) {
      seller.kycDocuments.msmeDoc = {
        fileName: req.files.msme_doc[0].filename,
        fileUrl: req.files.msme_doc[0].path,
        mimeType: req.files.msme_doc[0].mimetype
      };
    }

    seller.kycStatus = "pending";
    seller.isVerified = false;

    await seller.save();

    res.json({
      success: true,
      message: "KYC uploaded successfully"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

/* ================= LOGIN SELLER ================= */
exports.loginSeller = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const seller = await Seller.findOne({ phone });
    if (!seller) {
      return res.status(401).json({
        success: false,
        message: "Seller not found"
      });
    }

    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }

    const token = jwt.sign(
      { id: seller._id, role: "seller" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      seller: {
        id: seller._id,
        name: seller.name,
        shopName: seller.shopName,
        kycStatus: seller.kycStatus,
        isVerified: seller.isVerified
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

/* ================= LOGOUT ================= */
/* JWT based – frontend removes token */
exports.logoutSeller = async (req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully"
  });
};
