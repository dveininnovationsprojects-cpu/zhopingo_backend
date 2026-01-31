// models/Seller.js
const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  shopName: { type: String, required: true },
  gstNumber: { type: String, required: true }, 
  phone: { type: String, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  isVerified: { type: Boolean, default: false },

  
  
  fssaiNumber: { 
    type: String, 
    default: "" 
  },
  fssaiCertificate: { 
    type: String, 
    default: "" 
  },
  businessType: { 
    type: String, 
    enum: ['Groceries', 'Pharmacy', 'Electronics', 'Food'], 
    default: 'Groceries' 
  },
  shopLogo: { 
    type: String, 
    default: "" 
  },
  panNumber: { 
    type: String 
  }

}, { timestamps: true });

module.exports = mongoose.model('Seller', sellerSchema);