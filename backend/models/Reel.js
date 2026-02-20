const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
      required: true
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },

    videoUrl: {
      type: String,
      required: true
    },

    description: {
      type: String,
      required: true
    },

    shares: {
      type: Number,
      default: 0
    },

    // ❤️ ONLY SOURCE OF TRUTH
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    // 🌟 புதிய ஃபீல்டுகள்
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // பார்த்தவர்களின் ஐடி
  views: { type: Number, default: 0 },

    isBlocked: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reel', reelSchema);
