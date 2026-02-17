const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  email: { type: String, unique: true, sparse: true }, 
  phone: { type: String, required: true, unique: true }, 
  password: { type: String }, 
  role: { type: String, enum: ['customer', 'admin','seller'], default: 'customer' },
  
 
  walletBalance: { type: Number, default: 0 },
  walletTransactions: [{
    amount: Number,
    type: { type: String, enum: ['CREDIT', 'DEBIT'] },
    reason: String, 
    date: { type: Date, default: Date.now }
  }],
wishlist: [{ 
  type: mongoose.Schema.Types.ObjectId, 
  ref: 'Product' 
}],
 

addressBook: [{
  receiverName: String,
  addressType: String,
  flatNo: String,
  area: String,
  pincode: String,
  phone: String, 
  isDefault: { type: Boolean, default: false }
}]
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', userSchema);

