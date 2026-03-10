const mongoose = require('mongoose');

const financeSettingsSchema = new mongoose.Schema({
    commissionPercent: { type: Number, default: 10 },
    gstOnCommissionPercent: { type: Number, default: 18 },
    tdsPercent: { type: Number, default: 2 },
    settlementCycle: { type: String, default: "Weekly" },
    deductForwardDelivery: { type: Boolean, default: true },
    deductReturnDelivery: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('FinanceSettings', financeSettingsSchema);