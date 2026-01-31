const mongoose = require('mongoose');

const deliveryChargeSchema = new mongoose.Schema({
    pincode: { type: String, required: true, unique: true }, 
    charge: { type: Number, required: true }, 
    district: String,
    state: String
}, { timestamps: true });

module.exports = mongoose.model('DeliveryCharge', deliveryChargeSchema);