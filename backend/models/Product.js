


// const mongoose = require('mongoose');

// const productSchema = new mongoose.Schema({
//   name: { type: String, required: true, index: true }, 
//   description: { type: String, required: [true, "Product description is required"], trim: true },
  
//   // 🌟 ADDON: Brand name for better filtering
//   brand: { type: String, index: true }, 

//   category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
//   subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true, index: true },
  
//   // 🌟 ADDON: Essential for Groceries (Ex: "500g", "1kg", "Pack of 4")
//   weight: { type: String }, 

//   hsnCode: { type: String, required: true }, 
//   gstPercentage: { type: Number, required: true }, 

//   price: { type: Number, required: true, min: 0 }, 
//   mrp: { type: Number, required: true },
//   discountPercentage: { type: Number, default: 0 },
//   offerTag: { type: String }, 

//   variants: [{
//     attributeName: String, // Ex: Size, Color, Weight
//     attributeValue: String, // Ex: XL, Red, 1kg
//     price: Number,
//     stock: Number,
//     isDefault: { type: Boolean, default: false }
//   }],
  
//   images: [{ type: String }], 
//   video: { type: String }, 
  
//   stock: { type: Number, required: true, default: 0 },
  
//   // 🌟 ADDON: System can notify when stock is below this number
//   lowStockThreshold: { type: Number, default: 5 },

//   // 🌟 ADDON: Prevent bulk hoarding (Ex: limit to 5 per user)
//   maxQtyPerOrder: { type: Number, default: 10 },

//   seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  
//   // 🌟 NEW PREMIUM FIELDS
//   keyFeatures: [{ type: String }], 
//   ingredients: { type: String },
//   shelfLife: { type: String },
//   fssaiLicense: { type: String },
  
//   highlights: {
//     productType: { type: String }, 
//     cocoaContent: { type: String }, 
//     fabricType: { type: String }, 
//   },

//   nutritionInfo: [{
//     label: String, 
//     value: String  
//   }],

//   manufacturerDetails: {
//     countryOfOrigin: { type: String, default: "India" },
//     manufacturerNameAddress: { type: String },
//     marketerNameAddress: { type: String },
//     customerCareDetails: { type: String }
//   },

//   returnPolicy: { type: String },
//   storageTips: { type: String },

//   isVeg: { type: Boolean, default: true },
//   isFreeDelivery: { type: Boolean, default: false }, // Logic added to support your request
//   isReturnable: { type: Boolean, default: false },
//   returnWindow: { type: Number, default: 0 }, 
//   isCancellable: { type: Boolean, default: true },

//   ratings: [{
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     rating: { type: Number, min: 1, max: 5 },
//     comment: String,
//     createdAt: { type: Date, default: Date.now }
//   }],
//   averageRating: { type: Number, default: 0 },
//   // models/Product.js - Schema-la idhai sethuko
// isMaster: { type: Boolean, default: false }, // Admin create panna Master Product-ah?
// isApproved: { type: Boolean, default: true }, // Seller request approve aayiducha?
  
//   // 🌟 ADDON: SEO & Search Keywords (Ex: ["biscuits", "snacks", "cookies"])
//   tags: [{ type: String }],

//   isArchived: { type: Boolean, default: false }
// }, { timestamps: true });

// module.exports = mongoose.model('Product', productSchema);


const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // 🌟 NEW: Master Product List-oda link (Idhu dhaan main mapping)
  masterProductId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ProductList', 
    required: true,
    index: true 
  },

  // 🌟 Inga Name, Category, SubCat strings-ah store pannuvom (Easy fetch-ku)
  name: { type: String, required: true, index: true }, 
  brand: { type: String, index: true }, 
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true, index: true },
  
  // 🌟 HSN & GST: Master-la irundhu create aagumbodhu copy aagi inga vizhunthidum
  hsnCode: { type: String, required: true }, 
  gstPercentage: { type: Number, required: true }, 

  description: { type: String, required: [true, "Product description is required"], trim: true },
  weight: { type: String }, // Ex: "500g", "1kg"

  price: { type: Number, required: true, min: 0 }, 
  mrp: { type: Number, required: true },
  discountPercentage: { type: Number, default: 0 },
  offerTag: { type: String }, 

  variants: [{
    attributeName: String, 
    attributeValue: String, 
    price: Number,
    stock: Number,
    isDefault: { type: Boolean, default: false }
  }],
  
  images: [{ type: String }], 
  video: { type: String }, 
  stock: { type: Number, required: true, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  maxQtyPerOrder: { type: Number, default: 10 },

  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  
  // 🌟 MASTER LOGIC FIELDS
  isMaster: { type: Boolean, default: false }, // System master entry-ah?
  isApproved: { type: Boolean, default: true }, // Seller inventory status
  
  // PREMIMUM FIELDS
  keyFeatures: [{ type: String }], 
  ingredients: { type: String },
  shelfLife: { type: String },
  fssaiLicense: { type: String },
  
  highlights: {
    productType: { type: String }, 
    cocoaContent: { type: String }, 
    fabricType: { type: String }, 
  },

  nutritionInfo: [{
    label: String, 
    value: String  
  }],

  manufacturerDetails: {
    countryOfOrigin: { type: String, default: "India" },
    manufacturerNameAddress: { type: String },
    marketerNameAddress: { type: String },
    customerCareDetails: { type: String }
  },

  returnPolicy: { type: String },
  storageTips: { type: String },

  isVeg: { type: Boolean, default: true },
  isFreeDelivery: { type: Boolean, default: false }, 
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
  tags: [{ type: String }],
  isArchived: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
}
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);