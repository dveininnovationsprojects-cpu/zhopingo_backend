const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    image: { type: String, required: true }, 
    description: { type: String },
    // 🌟 Removed hsnCode and gstRate from here as per your logic
    isActive: { type: Boolean, default: true },
    isPermanent: { type: Boolean, default: false },
    iconName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);