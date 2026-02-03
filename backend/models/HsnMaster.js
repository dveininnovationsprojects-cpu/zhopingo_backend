const mongoose = require('mongoose');

const hsnMasterSchema = new mongoose.Schema({
    hsnCode: { type: String, required: true, unique: true }, // e.g., "6109"
    description: { type: String }, // e.g., "T-shirts, vests..."
    gstRate: { type: Number, required: true }, // e.g., 12
    status: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('HsnMaster', hsnMasterSchema);