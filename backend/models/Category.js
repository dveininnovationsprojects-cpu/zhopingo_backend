const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    image: { type: String, required: true }, 
    description: { type: String },
    hsnCode: { type: String, required: true }, // Linked to HSN Master
    gstRate: { type: Number, required: true }, // Linked to HSN Master
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);