const mongoose = require('mongoose');

const productListSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },
    // 🌟 New: Master Product specific image
    image: { type: String, default: "" }, 
    hsnMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'HsnMaster'},
    seller: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Seller', // Indha ref dhaan shopName populate panna help pannum
    required: true 
},
    status: { type: String, enum: ['pending', 'active', 'rejected','approved'], default: 'active' },
    isApproved: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('ProductList', productListSchema);