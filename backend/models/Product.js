


// const mongoose = require('mongoose');

// const productSchema = new mongoose.Schema({
//   name: { type: String, required: true, index: true }, 
  
//   // 🌟 திருத்தப்பட்ட பகுதி: தயாரிப்பைப் பற்றிய விரிவான விளக்கம் (About Product)
//   description: { 
//     type: String, 
//     required: [true, "Product description is required"],
//     trim: true 
//   },

//   category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
//   subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true, index: true },
//   hsnCode: { type: String, required: true }, 
//   gstPercentage: { type: Number, required: true }, 

//   price: { type: Number, required: true, min: 0 }, 
//   mrp: { type: Number, required: true },
//   discountPercentage: { type: Number, default: 0 },
//   offerTag: { type: String }, 

//   variants: [{
//     attributeName: String, 
//     attributeValue: String, 
//     price: Number,
//     stock: Number,
//     isDefault: { type: Boolean, default: false }
//   }],
  
//   images: [{ type: String }], 
//   video: { type: String }, 

//   stock: { type: Number, required: true, default: 0 },
//   seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
//   isFreeDelivery: { type: Boolean, default: false }, 
  
//   fssaiLicense: { type: String }, 
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

//   isArchived: { type: Boolean, default: false }
// }, { timestamps: true });

// module.exports = mongoose.model('Product', productSchema);


// const mongoose = require('mongoose');

// const productSchema = new mongoose.Schema({
//   name: { type: String, required: true, index: true }, 
//   description: { type: String, required: [true, "Product description is required"], trim: true },
//   category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
//   subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true, index: true },
//   hsnCode: { type: String, required: true }, 
//   gstPercentage: { type: Number, required: true }, 
//   price: { type: Number, required: true, min: 0 }, 
//   mrp: { type: Number, required: true },
//   discountPercentage: { type: Number, default: 0 },
//   offerTag: { type: String }, 

//   variants: [{
//     attributeName: String, 
//     attributeValue: String, 
//     price: Number,
//     stock: Number,
//     isDefault: { type: Boolean, default: false }
//   }],
  
//   images: [{ type: String }], 
//   video: { type: String }, 
//   stock: { type: Number, required: true, default: 0 },
//   seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  
//   // 🌟 NEW PREMIUM FIELDS (Optional - Will not break existing code)
//   keyFeatures: [{ type: String }], // Bullet points
//   ingredients: { type: String },
//   shelfLife: { type: String },
//   fssaiLicense: { type: String },
  
//   highlights: {
//     productType: { type: String }, // Ex: Milk Chocolate
//     cocoaContent: { type: String }, 
//     fabricType: { type: String },  // For Fashion
//   },

//   nutritionInfo: [{
//     label: String, // Protein, Sugar, etc.
//     value: String  // 5g, 10g, etc.
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
//   isArchived: { type: Boolean, default: false }
// }, { timestamps: true });

// module.exports = mongoose.model('Product', productSchema);


const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true }, 
  description: { type: String, required: [true, "Product description is required"], trim: true },
  
  // 🌟 ADDON: Brand name for better filtering
  brand: { type: String, index: true }, 

  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true, index: true },
  
  // 🌟 ADDON: Essential for Groceries (Ex: "500g", "1kg", "Pack of 4")
  weight: { type: String }, 

  hsnCode: { type: String, required: true }, 
  gstPercentage: { type: Number, required: true }, 

  price: { type: Number, required: true, min: 0 }, 
  mrp: { type: Number, required: true },
  discountPercentage: { type: Number, default: 0 },
  offerTag: { type: String }, 

  variants: [{
    attributeName: String, // Ex: Size, Color, Weight
    attributeValue: String, // Ex: XL, Red, 1kg
    price: Number,
    stock: Number,
    isDefault: { type: Boolean, default: false }
  }],
  
  images: [{ type: String }], 
  video: { type: String }, 
  
  stock: { type: Number, required: true, default: 0 },
  
  // 🌟 ADDON: System can notify when stock is below this number
  lowStockThreshold: { type: Number, default: 5 },

  // 🌟 ADDON: Prevent bulk hoarding (Ex: limit to 5 per user)
  maxQtyPerOrder: { type: Number, default: 10 },

  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },
  
  // 🌟 NEW PREMIUM FIELDS
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
  isFreeDelivery: { type: Boolean, default: false }, // Logic added to support your request
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
  
  // 🌟 ADDON: SEO & Search Keywords (Ex: ["biscuits", "snacks", "cookies"])
  tags: [{ type: String }],

  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);