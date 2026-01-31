const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true }, 
  description: String,
  price: { 
    type: Number, 
    required: true,
    min: [0, 'Price cannot be negative']
  }, 
  mrp: { 
    type: Number, 
    required: true,
    validate: {
      validator: function(val) {
        return val >= this.price; 
      },
      message: 'MRP must be greater than or equal to the selling price'
    }
  },
  hsnCode: { type: String, required: true }, 
  gstPercentage: { type: Number, required: true }, 
  stock: { type: Number, required: true, default: 0 },
  images: [{ type: String }], 
  video: { type: String }, 
  

  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true,
    index: true 
  },
  subCategory: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SubCategory', 
    required: true,
    index: true
  },
  
  weight: { type: String },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
  isReturnable: { type: Boolean, default: false },
  returnWindow: { type: Number, default: 0 }, 
  isCancellable: { type: Boolean, default: true },
  offerTag: { type: String }, 
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);