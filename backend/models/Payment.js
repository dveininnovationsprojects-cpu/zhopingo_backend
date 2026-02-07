const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    transactionId: {
      type: String,
      required: true // Cashfree order_id
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING"
    },
    rawResponse: Object
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
