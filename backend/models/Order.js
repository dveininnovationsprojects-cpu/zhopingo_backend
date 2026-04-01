
// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//     customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
//     // 🛒 Individual Items List
//     items: [{
//         productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
//         name: { type: String, required: true },
//         quantity: { type: Number, required: true },
//         price: { type: Number, required: true }, 
//         hsnCode: { type: String, default: "0000" },
//         mrp: { type: Number },
//         sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true }, 
//         image: { type: String },
        
//         // 🌟 ITEM LEVEL STATUS (Handshake with Seller Package)
//         itemStatus: { 
//             type: String, 
//             default: 'Placed',
//             enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Return In-Progress', 'Returned']
//         },
//         itemAwbNumber: { type: String, default: null }
//     }],

//     // 🌟 THE SELLER SPLIT ENGINE (All individual tracking goes here)
//     sellerSplitData: [{
//         sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
//         shopName: String,
//         sellerSubtotal: Number,

//         // 🚀 INDIVIDUAL TRACKING PER SELLER (The Fix)
//         packageStatus: { 
//             type: String, 
//             default: 'Placed',
//             enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled', 'Returned']
//         },
//         awbNumber: { type: String, default: null }, // Maggie AWB vs Rice AWB
//         deliveredDate: { type: Date, default: null },
//         returnDate: { type: Date, default: null },

//         // Financials strictly for this seller package
//         commissionTotal: { type: Number, default: 0 },
//         gstTotal: { type: Number, default: 0 },
//         tdsTotal: { type: Number, default: 0 },
//         deliveryDeduction: { type: Number, default: 0 }, 
//         actualShippingCost: { type: Number, default: 0 }, 
//         customerChargedShipping: { type: Number, default: 0 }
//     }],

//     billDetails: {
//         mrpTotal: { type: Number, default: 0 },
//         productDiscount: { type: Number, default: 0 },
//         itemTotal: { type: Number, default: 0 }, 
//         handlingCharge: { type: Number, default: 0 }, 
//         deliveryCharge: { type: Number, default: 0 }
//     },

//     totalAmount: { type: Number, required: true },
//     paymentMethod: { type: String, required: true }, 
//     paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded'], default: 'Pending' },

//     // 🛡️ MAIN ORDER STATUS (Syncs based on all packages)
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
//         label: { type: String }
//     },
    
//     // Legacy support (optional, can be removed if strictly split)
//     awbNumber: { type: String, default: null } 
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
        
        // 🌟 ITEM LEVEL STATUS
        itemStatus: { 
            type: String, 
            default: 'Placed',
            enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Return In-Progress', 'Returned']
        },
        itemAwbNumber: { type: String, default: null },

        // 🛡️ REAL-WORLD RETURN LOGIC: Missing metadata
        returnReason: { type: String, default: null },
        returnImages: [{ type: String }], // Multi-proof support
        returnProcessedDate: { type: Date, default: null }
    }],

    sellerSplitData: [{
        sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
        shopName: String,
        sellerSubtotal: Number,
        
        packageStatus: { 
            type: String, 
            default: 'Placed',
            enum: ['Placed', 'Shipped', 'Delivered', 'Cancelled', 'Returned','Packed']
        },
        awbNumber: { type: String, default: null }, 
        deliveredDate: { type: Date, default: null },
        returnDate: { type: Date, default: null },

        // Financials strictly for this seller package
        commissionTotal: { type: Number, default: 0 },
        gstTotal: { type: Number, default: 0 }, // GST on Commission
        tdsTotal: { type: Number, default: 0 },
        deliveryDeduction: { type: Number, default: 0 }, 
        actualShippingCost: { type: Number, default: 0 }, 
        customerChargedShipping: { type: Number, default: 0 },

        // 🛡️ THE SETTLEMENT FIX: Net amount Admin owes the Seller
        finalPayableToSeller: { type: Number, default: 0 },
        isSettled: { type: Boolean, default: false } // Payout status for Admin
    }],

    billDetails: {
        mrpTotal: { type: Number, default: 0 },
        productDiscount: { type: Number, default: 0 },
        itemTotal: { type: Number, default: 0 }, 
        handlingCharge: { type: Number, default: 0 }, 
        deliveryCharge: { type: Number, default: 0 },
        totalTax: { type: Number, default: 0 } // Real-world tax info
    },

    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, required: true }, 
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded'], default: 'Pending' },

    status: { 
        type: String, 
        default: 'Placed',
        enum: [
            'Pending', 'Placed', 'Shipped', 'Delivered', 'Cancelled', 
            'Partially Cancelled', 'Partially Shipped', 'Return Requested', 
            'Return In-Progress', 'Returned'
        ] 
    },

    shippingAddress: {
        receiverName: { type: String },
        flatNo: { type: String },
        addressLine: { type: String },
        pincode: { type: String },
        label: { type: String },
        phone: { type: String } // 📞 Delivery boy-ku phone number schema-la irukkanum
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);