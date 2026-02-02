const Seller = require("../models/Seller");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/* ================= REGISTER SELLER ================= */
exports.registerSeller = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      shopName,
      panNumber,
      gstNumber,
      fssaiNumber
    } = req.body;

    const existingSeller = await Seller.findOne({ phone });
    if (existingSeller) {
      return res.status(400).json({
        success: false,
        message: "Seller already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const seller = await Seller.create({
      name,
      phone,
      email,
      password: hashedPassword,
      shopName,
      panNumber,
      gstNumber,
      fssaiNumber,
      isVerified: false
    });

    res.status(201).json({
      success: true,
      message: "Seller registered successfully",
      sellerId: seller._id
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
        isVerified: seller.isVerified
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ================= LOGOUT SELLER ================= */
exports.logoutSeller = async (req, res) => {
  // JWT based logout – frontend removes token
  res.json({
    success: true,
    message: "Logged out successfully"
  });
};
