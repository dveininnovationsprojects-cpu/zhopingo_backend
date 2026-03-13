const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, 
    type: { 
        type: String, 
        enum: ['Order_Sale', 'Weekly_Payout', 'Adjustment'], 
        required: true 
    },
    credit: { type: Number, default: 0 }, // 📥 Money coming in
    debit: { type: Number, default: 0 },  // 📤 Money going out (Payout)
    balance: { type: Number, required: true }, // 💰 Wallet balance after this entry
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ledger', ledgerSchema);