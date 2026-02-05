// const mongoose = require("mongoose");

// const paymentSchema = new mongoose.Schema(
//   {
//     orderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Order",
//       required: true
//     },

//     transactionId: {
//       type: String,
//       default: null   // 🔥 REQUIRED FIX
//     },

//     paymentGateway: {
//       type: String,
//       enum: ["Cashfree", "Razorpay"],
//       default: "Cashfree"
//     },

//     amount: {
//       type: Number,
//       required: true
//     },

//     status: {
//       type: String,
//       enum: ["PENDING", "SUCCESS", "FAILED"], // 🔥 CONTROLLER MATCH
//       default: "PENDING"
//     },

//     rawResponse: {
//       type: Object
//     }
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Payment", paymentSchema);


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
      required: true   // 🔥 Cashfree order_id
    },

    paymentGateway: {
      type: String,
      enum: ["Cashfree"],
      default: "Cashfree"
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
