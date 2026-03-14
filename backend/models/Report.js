const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Reviewed'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);