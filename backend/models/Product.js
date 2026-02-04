const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true }, 
  description: String,
  

  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true, index: true },
  hsnCode: { type: String, required: true }, // Inherited from SubCategory
  gstPercentage: { type: Number, required: true }, // Inherited from SubCategory


  price: { type: Number, required: true, min: 0 }, 
  mrp: { type: Number, required: true },
  discountPercentage: { type: Number, default: 0 },
  offerTag: { type: String }, // e.g., "Bestseller", "20% OFF"


  variants: [{
    attributeName: String, // e.g., "Volume"
    attributeValue: String, // e.g., "500ml"
    price: Number,
    stock: Number,
    isDefault: { type: Boolean, default: false }
  }],

  
  images: [{ type: String }], 
  video: { type: String }, 


  stock: { type: Number, required: true, default: 0 },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  isFreeDelivery: { type: Boolean, default: false }, 
  

  fssaiLicense: { type: String }, 
  isReturnable: { type: Boolean, default: false },
  returnWindow: { type: Number, default: 0 }, 
  isCancellable: { type: Boolean, default: true },

  
  ratings: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  averageRating: { type: Number, default: 0 },

  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);