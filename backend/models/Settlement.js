const mongoose = require("mongoose");

const SettlementSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },
    weekRange: { type: String, required: true },
    totalSales: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    commissionTotal: { type: Number, default: 0 },
    gstTotal: { type: Number, default: 0 },
    tdsTotal: { type: Number, default: 0 },
    deliveryTotal: { type: Number, default: 0 },
    finalPayable: { type: Number, required: true },
    status: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
    utrNumber: { type: String },
    // models/Settlement.js (Fields add panniko)
    logisticsShare: { type: Number, default: 0 }, // Delhivery-ku pogum share
    adminLogisticsProfit: { type: Number, default: 0 }, // Delivery-la Admin-ku kedacha profit
    paymentDate: { type: Date },
    
  },
  { timestamps: true },
);


module.exports = mongoose.model("Settlement", SettlementSchema);
