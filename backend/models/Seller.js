const mongoose = require("mongoose");

const sellerSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, required: true, unique: true },
  email: String,
  password: { type: String, required: true },
  shopName: String,
  panNumber: String,
  gstNumber: String,
  fssaiNumber: String,
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Seller", sellerSchema);
