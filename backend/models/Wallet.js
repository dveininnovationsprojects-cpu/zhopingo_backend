const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0
    },
    transactions: [
        {
            amount: { type: Number, required: true },
            type: { 
                type: String, 
                enum: ['CREDIT', 'DEBIT'], 
                required: true 
            },
            reason: { type: String, default: 'Wallet Transaction' },
            txnId: { type: String },
            date: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);