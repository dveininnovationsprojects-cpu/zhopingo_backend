const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    image: { type: String },
    description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('SubCategory', subCategorySchema);