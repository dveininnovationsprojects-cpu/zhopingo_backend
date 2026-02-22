const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, 
        hsnCode: { type: String, default: "0000" },
        mrp: { type: Number },
        // 🔥 இங்கதான் மஜாவே இருக்கு: ref குடுத்தா தான் shopName வரும்
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true }, 
        image: { type: String }
    }],
    sellerSplitData: [{
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
        sellerSubtotal: Number,
        actualShippingCost: Number,
        customerChargedShipping: Number
    }],
    billDetails: {
        mrpTotal: { type: Number, default: 0 },
        productDiscount: { type: Number, default: 0 },
        itemTotal: { type: Number, default: 0 }, 
        handlingCharge: { type: Number, default: 2 }, 
        deliveryCharge: { type: Number, default: 0 }
    },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, required: true }, 
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded'], default: 'Pending' },
    status: { 
        type: String, 
        default: 'Placed',
        enum: ['Pending', 'Placed', 'Shipped', 'Delivered', 'Cancelled'] 
    },
    shippingAddress: {
        receiverName: { type: String },
        flatNo: { type: String },
        addressLine: { type: String },
        pincode: { type: String },
        label: { type: String }
    },
    awbNumber: { type: String, default: null },
    arrivedIn: { type: String, default: "15 mins" } 
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);