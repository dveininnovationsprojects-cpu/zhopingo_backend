const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // 🌟 items-ஐ விரிவாகக் குறிப்பிடுவது நல்லது (Best Practice)
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
        image: { type: String }
    }],
    sellerSplitData: { type: Array, default: [] }, 
    totalAmount: { type: Number, required: true },
    deliveryChargeApplied: { type: Number, default: 0 }, 
    paymentMethod: { 
        type: String, 
        enum: ['COD', 'ONLINE', 'WALLET'], 
        required: true 
    },
    // 🌟 paymentStatus சேர்த்துள்ளேன் - இது பேமெண்ட் முடிந்ததா இல்லையா என்பதைச் சொல்லும்
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending'
    },
    status: { 
        type: String, 
        default: 'Placed', 
        enum: ['Pending', 'Placed', 'Shipped', 'Delivered', 'Cancelled'] 
    },
   
    shippingAddress: {
        flatNo: { type: String },
        addressLine: { type: String },
        pincode: { type: String },
        label: { type: String, default: "Home" },
        receiverName: { type: String }
    },
    isArchived: { type: Boolean, default: false }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;