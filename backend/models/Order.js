const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: Array, required: true },
    sellerSplitData: { type: Array, default: [] }, 
    totalAmount: { type: Number, required: true },
    deliveryChargeApplied: { type: Number, default: 0 }, 
    paymentMethod: { type: String, enum: ['COD', 'ONLINE', 'WALLET'], required: true },
    status: { 
        type: String, 
        default: 'Placed', 
        enum: ['Pending', 'Placed', 'Shipped', 'Delivered', 'Cancelled'] 
    },
    shippingAddress: { type: Object, required: true },
    isArchived: { type: Boolean, default: false }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;