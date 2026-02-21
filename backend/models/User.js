const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  email: { type: String, unique: true, sparse: true }, 
  phone: { type: String, required: true, unique: true }, 
  password: { type: String }, 
  role: { type: String, enum: ['customer', 'admin','seller'], default: 'customer' },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  country: { type: String, default: "India" },
  
 
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

// userSchema.pre('save', async function() {
//   if (!this.isModified('password') || !this.password) return;
//   this.password = await bcrypt.hash(this.password, 10);
// });
userSchema.pre('save', async function(next) {
  // 🌟 அட்மின் ரோல் இருந்தா ஹேஷிங் பண்ணாம அடுத்த ஸ்டெப்பிற்கு போயிடும்
  if (this.role === 'admin') return next(); 

  // மத்தவங்களுக்கு (Customer, Seller) பாஸ்வேர்ட் மாறினா மட்டும் ஹேஷ் பண்ணும்
  if (!this.isModified('password') || !this.password) return next();
  
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);

