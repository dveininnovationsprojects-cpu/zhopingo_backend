// models/SubCategory.js
const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }, 
  image: { type: String, required: true },
  description: { type: String },
  hsnCode: { type: String } 
}, { timestamps: true });

module.exports = mongoose.model('SubCategory', subCategorySchema);