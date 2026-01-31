const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    totalOrderAmount: Number, 
    adminCommission: Number, 
    deliveryCharges: Number,
    sellerSettlementAmount: Number,
    status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Payout', payoutSchema);