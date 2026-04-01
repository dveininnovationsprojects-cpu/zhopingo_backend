


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
//         sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true }, 
//         image: { type: String },
        
//         // 🌟 ITEM LEVEL STATUS
//         itemStatus: { 
//             type: String, 
//             default: 'Placed',
//             enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Return In-Progress', 'Returned']
//         },
//         itemAwbNumber: { type: String, default: null },

//         // 🛡️ REAL-WORLD RETURN LOGIC: Missing metadata
//         returnReason: { type: String, default: null },
//         returnImages: [{ type: String }], // Multi-proof support
//         returnProcessedDate: { type: Date, default: null }
//     }],

//     sellerSplitData: [{
//         sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
//         shopName: String,
//         sellerSubtotal: Number,
        
//         packageStatus: { 
//             type: String, 
//             default: 'Placed',
//             enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled', 'Returned','Packed']
//         },
//         awbNumber: { type: String, default: null }, 
//         deliveredDate: { type: Date, default: null },
//         returnDate: { type: Date, default: null },

//         // Financials strictly for this seller package
//         commissionTotal: { type: Number, default: 0 },
//         gstTotal: { type: Number, default: 0 }, // GST on Commission
//         tdsTotal: { type: Number, default: 0 },
//         deliveryDeduction: { type: Number, default: 0 }, 
//         actualShippingCost: { type: Number, default: 0 }, 
//         customerChargedShipping: { type: Number, default: 0 },

//         // 🛡️ THE SETTLEMENT FIX: Net amount Admin owes the Seller
//         finalPayableToSeller: { type: Number, default: 0 },
//         isSettled: { type: Boolean, default: false } // Payout status for Admin
//     }],

//     billDetails: {
//         mrpTotal: { type: Number, default: 0 },
//         productDiscount: { type: Number, default: 0 },
//         itemTotal: { type: Number, default: 0 }, 
//         handlingCharge: { type: Number, default: 0 }, 
//         deliveryCharge: { type: Number, default: 0 },
//         totalTax: { type: Number, default: 0 } // Real-world tax info
//     },

//     totalAmount: { type: Number, required: true },
//     paymentMethod: { type: String, required: true }, 
//     paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded'], default: 'Pending' },

//     status: { 
//         type: String, 
//         default: 'Placed',
//         enum: [
//             'Pending', 'Placed', 'Shipped', 'Delivered', 'Cancelled', 
//             'Partially Cancelled', 'Partially Shipped', 'Return Requested', 
//             'Return In-Progress', 'Returned'
//         ] 
//     },

//     shippingAddress: {
//         receiverName: { type: String },
//         flatNo: { type: String },
//         addressLine: { type: String },
//         pincode: { type: String },
//         label: { type: String },
//         phone: { type: String } // 📞 Delivery boy-ku phone number schema-la irukkanum
//     }
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
        
        // 🌟 ITEM LEVEL STATUS (Stepper Sync)
        itemStatus: { 
            type: String, 
            default: 'Placed',
            enum: [
                'Placed', 'Packed', 'Shipped', 
                'In Transit', // 👈 Space match for Webhook
                'Out for delivery', // 👈 Added for Real-time tracking
                'Delivered', 'Cancelled', 
                'Return Requested', 'Return Approved', 'Return In-Progress', 'Returned'
            ]
        },
        itemAwbNumber: { type: String, default: null },
        returnReason: { type: String, default: null },
        returnImages: [{ type: String }], 
        returnProcessedDate: { type: Date, default: null }
    }],

    sellerSplitData: [{
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
        shopName: String,
        sellerSubtotal: Number,
        
        // 🌟 SELLER PACKAGE STATUS
        packageStatus: { 
            type: String, 
            default: 'Placed',
            enum: [
                'Placed', 'Packed', 'Shipped', 
                'In Transit', // 👈 Space match for Webhook
                'Out for delivery', // 👈 Added for Real-time tracking
                'Delivered', 'Cancelled', 
                'Return Requested', 'Return Approved', 'Return In-Progress', 'Returned'
            ]
        },
        awbNumber: { type: String, default: null }, 
        returnAwbNumber: { type: String, default: null }, 
        deliveredDate: { type: Date, default: null },
        returnDate: { type: Date, default: null },
        commissionTotal: { type: Number, default: 0 },
        gstTotal: { type: Number, default: 0 }, 
        tdsTotal: { type: Number, default: 0 },
        deliveryDeduction: { type: Number, default: 0 }, 
        actualShippingCost: { type: Number, default: 0 }, 
        customerChargedShipping: { type: Number, default: 0 },
        finalPayableToSeller: { type: Number, default: 0 },
        isSettled: { type: Boolean, default: false } 
    }],

    billDetails: {
        mrpTotal: { type: Number, default: 0 },
        productDiscount: { type: Number, default: 0 },
        itemTotal: { type: Number, default: 0 }, 
        handlingCharge: { type: Number, default: 0 }, 
        deliveryCharge: { type: Number, default: 0 },
        totalTax: { type: Number, default: 0 } 
    },

    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, required: true }, 
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded'], default: 'Pending' },

    // 🌟 GLOBAL MASTER STATUS
    status: { 
        type: String, 
        default: 'Placed',
        enum: [
            'Pending', 'Placed', 'Shipped', 
            'In Transit', // 👈 Space match for Webhook
            'Out for delivery', // 👈 Added
            'Delivered', 'Cancelled', 
            'Partially Cancelled', 'Partially Shipped', 
            'Return Requested', 'Return Approved', 'Return In-Progress', 'Returned'
        ] 
    },

    shippingAddress: {
        receiverName: { type: String },
        flatNo: { type: String },
        addressLine: { type: String },
        pincode: { type: String },
        label: { type: String },
        phone: { type: String }
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);