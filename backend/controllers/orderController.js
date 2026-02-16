const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryCharge = require('../models/DeliveryCharge');
const Payout = require('../models/Payout');


exports.createOrder = async (req, res) => {
  try {
    const { items, customerId, shippingAddress, paymentMethod } = req.body;

    if (!items || !items.length) return res.status(400).json({ success: false, message: "Cart is empty" });

    const deliveryConfig = await DeliveryCharge.findOne({ pincode: shippingAddress.pincode });
    const baseDeliveryCharge = deliveryConfig ? deliveryConfig.charge : 40;

    let mrpTotal = 0;
    let sellingPriceTotal = 0;
    const handlingCharge = 2; 
    let sellerWiseSplit = {};

    const processedItems = items.map(item => {
      const price = Number(item.price) || 0;
      const mrp = Number(item.mrp) || price;
      const quantity = Number(item.quantity) || 1;
      
      mrpTotal += mrp * quantity;
      sellingPriceTotal += price * quantity;

      const actualSellerId = (item.sellerId || item.seller || "admin_seller").toString();

      if (!sellerWiseSplit[actualSellerId]) {
        sellerWiseSplit[actualSellerId] = {
          sellerId: actualSellerId,
          items: [],
          sellerSubtotal: 0,
          deliveryChargeApplied: baseDeliveryCharge
        };
      }
      sellerWiseSplit[actualSellerId].sellerSubtotal += (price * quantity);
      sellerWiseSplit[actualSellerId].items.push(item);

      return {
        productId: item._id || item.productId,
        name: item.name,
        quantity,
        price,
        mrp,
        sellerId: actualSellerId,
        image: item.image || (item.images && item.images[0])
      };
    });

    const totalDeliveryCharge = Object.values(sellerWiseSplit).reduce((acc, curr) => acc + curr.deliveryChargeApplied, 0);
    const grandTotal = sellingPriceTotal + handlingCharge + totalDeliveryCharge;

    const newOrder = new Order({
      customerId,
      items: processedItems,
      sellerSplitData: Object.values(sellerWiseSplit),
      billDetails: { mrpTotal, productDiscount: mrpTotal - sellingPriceTotal, itemTotal: sellingPriceTotal, handlingCharge, deliveryCharge: totalDeliveryCharge },
      totalAmount: grandTotal,
      paymentMethod,
      paymentStatus: (paymentMethod === 'WALLET' || paymentMethod === 'ONLINE') ? 'Paid' : 'Pending',
      status: (paymentMethod === 'WALLET' || paymentMethod === 'ONLINE') ? 'Placed' : 'Pending',
      shippingAddress,
      arrivedIn: `${Math.floor(Math.random() * (15 - 8) + 8)} mins`
    });

    await newOrder.save();
    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getSellerOrders = async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const orders = await Order.find({
      "items.sellerId": sellerId,
      status: { $ne: 'Pending' }
    }).sort({ createdAt: -1 });

    
    const filteredOrders = orders.map(order => {
        const sellerItems = order.items.filter(i => i.sellerId === sellerId);
        const sellerSubtotal = sellerItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        return {
            _id: order._id,
            status: order.status,
            customer: order.customerId, 
            items: sellerItems,
            sellerAmount: sellerSubtotal,
            createdAt: order.createdAt,
            shippingAddress: order.shippingAddress
        };
    });

    res.json({ success: true, data: filteredOrders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 });
      
    
    const stats = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
        pendingOrders: orders.filter(o => o.status === 'Placed').length
    };

    res.json({ success: true, stats, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };
    if (status === 'Delivered') updateData.paymentStatus = 'Paid';

    const order = await Order.findByIdAndUpdate(req.params.orderId, updateData, { new: true });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Payout Logic on Delivery
    if (status === 'Delivered') {
      const adminCommPercent = 10;
      for (let split of order.sellerSplitData) {
        const commission = (split.sellerSubtotal * adminCommPercent) / 100;
        await Payout.create({
          orderId: order._id,
          sellerId: split.sellerId,
          totalOrderAmount: split.sellerSubtotal,
          adminCommission: commission,
          deliveryCharges: split.deliveryChargeApplied,
          sellerSettlementAmount: (split.sellerSubtotal + split.deliveryChargeApplied) - commission,
          status: 'Pending'
        });
      }
    }
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
    5️⃣ CUSTOMER API: Get My Orders
===================================================== */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.userId, status: { $ne: "Pending" } }).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
/* =====================================================
    6️⃣ CANCEL ORDER + REFUND (விடுபட்ட பங்க்ஷன்)
===================================================== */
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // ஒருவேளை ஆர்டர் ஏற்கனவே பெய்டு (Paid) ஆக இருந்தால், பணத்தை வாலட்டுக்கு ரீஃபண்ட் செய்யணும்
    if (order.paymentStatus === 'Paid' && order.status !== 'Cancelled') {
      const user = await User.findById(order.customerId);
      if (user) {
        user.walletBalance += order.totalAmount;
        user.walletTransactions.unshift({
          amount: order.totalAmount,
          type: 'CREDIT',
          reason: `Refund for Order #${order._id.toString().slice(-6).toUpperCase()}`,
          txnId: order._id.toString(),
          date: new Date()
        });
        await user.save();
      }
    }

    order.status = 'Cancelled';
    order.paymentStatus = order.paymentStatus === 'Paid' ? 'Refunded' : 'Failed';
    
    await order.save();
    res.json({ success: true, message: "Order cancelled and refund processed." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};