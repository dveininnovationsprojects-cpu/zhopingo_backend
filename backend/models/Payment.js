const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  transactionId: { type: String, required: true }, 
  paymentGateway: { type: String, enum: ['Cashfree', 'Razorpay'], default: 'Cashfree' },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Success', 'Failed'], default: 'Pending' },
  rawResponse: Object 
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);  