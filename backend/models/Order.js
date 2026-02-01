const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: Array,
    totalAmount: Number,
    deliveryChargeApplied: Number, 
    paymentMethod: { type: String, enum: ['COD', 'ONLINE', 'WALLET'], required: true },
    status: { 
        type: String, 
        default: 'Placed', 
        enum: ['Pending', 'Placed', 'Shipped', 'Delivered', 'Cancelled'] 
    },
    shippingAddress: Object
}, { timestamps: true });


const Order = mongoose.model('Order', orderSchema);
module.exports = Order;