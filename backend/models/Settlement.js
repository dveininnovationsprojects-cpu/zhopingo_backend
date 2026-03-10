const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
    weekRange: { type: String }, // Ex: "Mar 01 - Mar 07"
    totalSales: { type: Number },
    orderCount: { type: Number },
    commissionTotal: { type: Number },
    gstTotal: { type: Number },
    tdsTotal: { type: Number },
    deliveryTotal: { type: Number },
    finalPayable: { type: Number },
    status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
    utrNumber: { type: String },
    paymentDate: { type: Date }
}, { timestamps: true });