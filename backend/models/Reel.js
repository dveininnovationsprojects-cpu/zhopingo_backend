// models/Reel.js
const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
 sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, 
  videoUrl: { type: String, required: true }, 
  description: { type: String, required: true }, 
  
  shares: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isBlocked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Reel', reelSchema);