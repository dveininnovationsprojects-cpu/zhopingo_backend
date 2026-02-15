// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const userSchema = new mongoose.Schema({
//   name: { type: String, default: "" },
//   email: { type: String, unique: true, sparse: true }, 
//   phone: { type: String, required: true, unique: true }, 
//   password: { type: String }, 
//   role: { type: String, enum: ['customer', 'admin','seller'], default: 'customer' },
  
 
//   walletBalance: { type: Number, default: 0 },
//   walletTransactions: [{
//     amount: Number,
//     type: { type: String, enum: ['CREDIT', 'DEBIT'] },
//     reason: String, 
//     date: { type: Date, default: Date.now }
//   }],

 
//   addressBook: [{
//     label: { type: String, default: "Home" }, 
//     addressLine: String,
//     city: String,
//     state: String,
//     pincode: String,
//     isDefault: { type: Boolean, default: false }
//   }]
// }, { timestamps: true });

// userSchema.pre('save', async function() {
//   if (!this.isModified('password') || !this.password) return;
//   this.password = await bcrypt.hash(this.password, 10);
// });

// module.exports = mongoose.model('User', userSchema);


const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // 👤 அடிப்படை விவரங்கள்
  name: { type: String, default: "" },
  email: { type: String, unique: true, sparse: true }, 
  phone: { type: String, required: true, unique: true }, 
  password: { type: String }, 
  role: { type: String, enum: ['customer', 'admin', 'seller'], default: 'customer' },
  
  // 💰 வாலட் மேனேஜ்மென்ட்
  walletBalance: { type: Number, default: 0 },
  walletTransactions: [{
    amount: { type: Number, required: true },
    type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    reason: { type: String }, // எ.கா: "Wallet Topup", "Order Payment"
    txnId: { type: String },  // 🌟 Cashfree-ன் 'topup_id' அல்லது 'order_id'-ஐச் சேமிக்க
    date: { type: Date, default: Date.now }
  }],

  // 📍 முகவரி விவரங்கள் (Address Book)
  addressBook: [{
    label: { type: String, default: "Home" }, // Home, Work, Hotel, Other
    flatNo: { type: String }, // 🌟 உன் ஆப்பில் 'House / Flat No' வாங்குவதால் இது அவசியம்
    addressLine: { type: String }, // Area / Landmark
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    isDefault: { type: Boolean, default: false }
  }]
}, { timestamps: true });

// 🔒 பாஸ்வேர்டு என்க்ரிப்ஷன் லாஜிக் (திருத்தப்பட்டது)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);