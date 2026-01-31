const Seller = require('../models/Seller');
const Product = require('../models/Product');


exports.getDashboardStats = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.params.sellerId });
    const lowStockItems = products.filter(p => p.stock <= p.lowStockAlert);
    res.json({
      success: true,
      stats: { totalProducts: products.length, lowStockCount: lowStockItems.length, lowStockItems }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};


exports.getInventory = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.params.sellerId });
    res.json({ success: true, data: products });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
