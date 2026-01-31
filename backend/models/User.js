const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  email: { type: String, unique: true, sparse: true }, 
  phone: { type: String, required: true, unique: true }, // Blinkit-ல் இதான் மெயின்
  password: { type: String }, 
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  
  // Wallet Section [Excel Rule 83]
  walletBalance: { type: Number, default: 0 },
  walletTransactions: [{
    amount: Number,
    type: { type: String, enum: ['CREDIT', 'DEBIT'] },
    reason: String, 
    date: { type: Date, default: Date.now }
  }],

  // Address Section [Excel Rule 3]
  addressBook: [{
    label: { type: String, default: "Home" }, 
    addressLine: String,
    city: String,
    state: String,
    pincode: String,
    isDefault: { type: Boolean, default: false }
  }]
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', userSchema);