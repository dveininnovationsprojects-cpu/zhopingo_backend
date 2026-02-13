const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    image: { type: String, required: true }, 
    description: { type: String },
    hsnCode: { type: String, required: true }, // Linked to HSN Master
    gstRate: { type: Number, required: true }, // Linked to HSN Master
    isActive: { type: Boolean, default: true },
    isPermanent: { type: Boolean, default: false },
    iconName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);