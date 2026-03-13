const mongoose = require('mongoose');

const LogisticsSettlementSchema = new mongoose.Schema({
    weekRange: { type: String, required: true }, // "2026-03-01 to 2026-03-07"
    totalOrders: { type: Number, default: 0 },
    totalCustomerPaidDelivery: { type: Number, default: 0 }, // Customer kitta Admin vaanguna moththa delivery charge
    totalPayableToLogistics: { type: Number, default: 0 },    // Delhivery-ku Admin kudukka vendiyadhu
    netAdminLogisticsProfit: { type: Number, default: 0 },    // Moththama delivery-la Admin-ku kedacha profit
    status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
    utrNumber: { type: String },
    paymentDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('LogisticsSettlement', LogisticsSettlementSchema);