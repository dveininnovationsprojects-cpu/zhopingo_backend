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
    
    // 🚚 Logistics Summary Fields
    deliveryTotal: { type: Number, default: 0 },      // Seller-kitta irundhu pudicha motha delivery deduction
    logisticsPartnerShare: { type: Number, default: 0 }, // Delivery team-ku pōga vendiya actual amount (API Call/Weight based)
    adminLogisticsProfit: { type: Number, default: 0 },  // Admin-ku delivery-la kedacha profit (Customer Paid - Partner Share)
    
    finalPayable: { type: Number, required: true },
    status: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
    
    payoutBreakdown: [{
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      orderDate: { type: Date },
      statusDate: { type: Date },
      deliveryDate: { type: Date },
      returnDate: { type: Date },
      type: { type: String }, 
      productName: { type: String }, 
      quantity: { type: Number },
      amount: { type: Number },
      commissionAmount: { type: Number },
      gstAmount: { type: Number },
      tdsAmount: { type: Number },
      
      // 🌟 Breakdown Logistics Transparency
      deliveryType: { type: String },      // "PAID" or "FREE"
      customerPaidShipping: { type: Number }, // Customer pay panna amount (e.g., 80)
      sellerDeduction: { type: Number },      // Seller-kitta pudichathu (e.g., 45 if FREE)
      logisticsPartnerCost: { type: Number }, // Partner-ku kuduka vendiyathu (e.g., 40)
      adminProfitOnShipping: { type: Number },// Admin profit (e.g., 40)
      
      netPayable: { type: Number }
    }],

    paymentDate: { type: Date },
    utrNumber: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settlement", SettlementSchema);