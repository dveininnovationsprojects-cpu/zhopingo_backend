const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: Array,
    totalAmount: Number,
    paymentMethod: { type: String, enum: ['COD', 'ONLINE', 'WALLET'], required: true },
    status: { type: String, default: 'Placed', enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled'] },
    shippingAddress: Object
}, { timestamps: true });