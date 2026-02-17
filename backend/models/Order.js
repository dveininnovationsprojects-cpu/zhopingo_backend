const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, 
        mrp: { type: Number },
        sellerId: { type: String, required: true }, // Seller ID-ஐ String-ஆக வைப்பது பாதுகாப்பானது
        image: { type: String }
    }],
    sellerSplitData: { type: Array, default: [] },
    billDetails: {
        mrpTotal: { type: Number, default: 0 },
        productDiscount: { type: Number, default: 0 },
        itemTotal: { type: Number, default: 0 }, 
        handlingCharge: { type: Number, default: 2 }, 
        deliveryCharge: { type: Number, default: 0 }
    },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, required: true }, // Enum தற்காலிகமாக நீக்கப்பட்டுள்ளது (Bypass Error தவிர்க்க)
    paymentStatus: { type: String, default: 'Pending' },
    status: { 
        type: String, 
        default: 'Placed'
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