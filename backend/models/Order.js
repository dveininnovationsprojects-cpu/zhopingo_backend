// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//     customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     items: [{
//         productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
//         name: { type: String, required: true },
//         quantity: { type: Number, required: true },
//         price: { type: Number, required: true }, 
//         hsnCode: { type: String, default: "0000" },
//         mrp: { type: Number },
//         // 🔥 இங்கதான் மஜாவே இருக்கு: ref குடுத்தா தான் shopName வரும்
//         sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true }, 
//         image: { type: String }
//     }],
//     sellerSplitData: [{
//         sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
//         sellerSubtotal: Number,
//         actualShippingCost: Number,
//         customerChargedShipping: Number
//     }],
//     billDetails: {
//         mrpTotal: { type: Number, default: 0 },
//         productDiscount: { type: Number, default: 0 },
//         itemTotal: { type: Number, default: 0 }, 
//         handlingCharge: { type: Number, default: 2 }, 
//         deliveryCharge: { type: Number, default: 0 }
//     },
//     totalAmount: { type: Number, required: true },
//     paymentMethod: { type: String, required: true }, 
//     paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded'], default: 'Pending' },
//     status: { 
//         type: String, 
//         default: 'Placed',
//         enum: ['Pending', 'Placed', 'Shipped', 'Delivered', 'Cancelled'] 
//     },
//     shippingAddress: {
//         receiverName: { type: String },
//         flatNo: { type: String },
//         addressLine: { type: String },
//         pincode: { type: String },
//         label: { type: String }
//     },
//     awbNumber: { type: String, default: null },
//     arrivedIn: { type: String, default: "15 mins" } 
// }, { timestamps: true });

// module.exports = mongoose.model('Order', orderSchema);

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
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true }, 
        image: { type: String },
        
        // 🌟 INDIVIDUAL ITEM STATUS: Maggie-ku thani status, Rice-ku thani status.
        itemStatus: { 
            type: String, 
            default: 'Placed',
            enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Return In-Progress', 'Returned']
        },
        // 🌟 Individual Tracking per Seller/Package
        itemAwbNumber: { type: String, default: null },
        itemDeliveredDate: { type: Date, default: null },
        itemReturnDate: { type: Date, default: null },

        // 🌟 RETURN LOGIC
        isReturnable: { type: Boolean, default: false },
        returnWindowDays: { type: Number, default: 0 },
        isReturned: { type: Boolean, default: false },
        returnReason: { type: String, default: "" }
    }],
    sellerSplitData: [{
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
        sellerSubtotal: Number,
        // 🌟 SELLER PACKAGE STATUS: Payout generate panna indha status strictly venum
        // Oru seller cancel aanaalum maththavanga status 'Placed'-la irukkanum
        packageStatus: { 
            type: String, 
            default: 'Placed',
            enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled', 'Returned']
        },
        commissionTotal: { type: Number, default: 0 },
        gstTotal: { type: Number, default: 0 },
        tdsTotal: { type: Number, default: 0 },
        deliveryDeduction: { type: Number, default: 0 }, 
        actualShippingCost: { type: Number, default: 0 }, 
        customerChargedShipping: { type: Number, default: 0 }
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
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded'], default: 'Pending' },
    status: { 
        type: String, 
        default: 'Placed',
        // 🌟 Added 'Partially Cancelled' / 'Partially Shipped' for UI clarity
        enum: ['Pending', 'Placed', 'Shipped', 'Delivered', 'Cancelled', 'Partially Cancelled', 'Return Requested', 'Return In-Progress', 'Returned'] 
    },
    deliveredDate: { type: Date, default: null },
    returnDate: { type: Date, default: null },
    isSettled: { type: Boolean, default: false }, 
    
    shippingAddress: {
        receiverName: { type: String },
        flatNo: { type: String },
        addressLine: { type: String },
        pincode: { type: String },
        label: { type: String }
    },
    awbNumber: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);