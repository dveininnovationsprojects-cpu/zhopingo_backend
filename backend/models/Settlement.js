const mongoose = require("mongoose");

const SettlementSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
    weekRange: { type: String, required: true },
    
    // 📊 Summary Totals
    totalSalesRevenue: { type: Number, default: 0 },   // Product Price Total (₹200)
    totalOrderCount: { type: Number, default: 0 },
    totalPlatformCommission: { type: Number, default: 0 },
    totalGstOnCommission: { type: Number, default: 0 },
    totalTdsDeduction: { type: Number, default: 0 },
    
    // 🚚 Logistics Summary (Admin View)
    totalSellerDeliveryDeduction: { type: Number, default: 0 }, // Seller kitta irundhu pudichathu
    totalLogisticsPartnerBill: { type: Number, default: 0 },    // Delivery team-ku namma thara vendiyathu
    totalAdminDeliveryProfit: { type: Number, default: 0 },      // Admin-ku delivery-la kedacha profit
    
    finalSettlementAmount: { type: Number, required: true }, // Seller-ku poga vendiya cash
    status: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
    
    payoutBreakdown: [{
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      productName: { type: String }, 
      type: { type: String }, // SALE or RETURN
      
      // 💰 Price Breakdown
      customerPaidTotal: { type: Number },     // Product + Shipping (e.g., 180)
      productPriceOnly: { type: Number },      // Strictly Product Price (e.g., 100)
      
      // 📉 Deductions
      platformCommission: { type: Number },
      gstOnCommission: { type: Number },
      tdsDeduction: { type: Number },
      
      // 🚚 Logistics Per Item Transparency
      shippingType: { type: String },          // PAID or FREE
      customerPaidShipping: { type: Number },  // Customer pay panna amount (e.g., 80)
      sellerShippingDeduction: { type: Number }, // Seller pays (e.g., 45 if FREE)
      logisticsPartnerCost: { type: Number },   // Delivery team share (e.g., 40)
      adminShippingProfit: { type: Number },    // Admin profit (e.g., 40 or 5)
      
      netPayableToSeller: { type: Number },     // Final for this product
      
      statusDate: { type: Date },
      deliveryDate: { type: Date },
      returnDate: { type: Date }
    }],

    paymentDate: { type: Date },
    utrNumber: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settlement", SettlementSchema);