const mongoose = require("mongoose");

const SettlementSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
    weekRange: { type: String, required: true },
    totalSales: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    commissionTotal: { type: Number, default: 0 },
    gstTotal: { type: Number, default: 0 },
    tdsTotal: { type: Number, default: 0 },
    deliveryTotal: { type: Number, default: 0 },
    finalPayable: { type: Number, required: true },
    status: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
    
    // 🌟 THE FIX: PayoutBreakdown must be an Array of Objects (NOT Strings)
    payoutBreakdown: [{
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      orderDate: { type: Date },
      statusDate: { type: Date },
      type: { type: String }, // SALE or RETURN
      productName: { type: String }, 
      quantity: { type: Number },
      amount: { type: Number },
      commissionPercent: { type: Number },
      commissionAmount: { type: Number },
      gstAmount: { type: Number },
      tdsAmount: { type: Number },
      deliveryDeduction: { type: Number },
      netPayable: { type: Number }
    }],

    paymentDate: { type: Date },
    utrNumber: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settlement", SettlementSchema);