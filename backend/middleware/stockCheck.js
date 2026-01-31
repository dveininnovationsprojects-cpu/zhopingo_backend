const Product = require('../models/Product');

// Excel Row 87: Notification logic for Low Stock
const stockCheck = async (req, res, next) => {
  const { items } = req.body;
  for (let item of items) {
    const product = await Product.findById(item.productId);
    if (product.stock < item.quantity) {
      return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
    }
    // Logic for Low Stock Alert
    if (product.stock <= product.lowStockAlert) {
      console.log(`⚠️ ALERT: Low stock for ${product.name}. Remaining: ${product.stock}`);
      // In production, trigger WhatsApp/SMTP API here (Excel Row 91/92)
    }
  }
  next();
};

module.exports = stockCheck;