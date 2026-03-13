const mongoose = require('mongoose');

const SettlementSchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
    weekRange: { type: String, required: true },
    totalSales: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    commissionTotal: { type: Number, default: 0 },
    gstTotal: { type: Number, default: 0 },
    tdsTotal: { type: Number, default: 0 },
    deliveryTotal: { type: Number, default: 0 },
    finalPayable: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
    utrNumber: { type: String },
    paymentDate: { type: Date }
}, { timestamps: true });

// 🌟 THE FIX: Intha line katchithama irukanum
module.exports = mongoose.model('Settlement', SettlementSchema);