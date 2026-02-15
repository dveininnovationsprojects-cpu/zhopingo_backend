const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryCharge = require('../models/DeliveryCharge');
const Payout = require('../models/Payout');

/* =====================================================
    1️⃣ CREATE ORDER
===================================================== */
exports.createOrder = async (req, res) => {
  try {
    const { items, customerId, shippingAddress, paymentMethod } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    if (!customerId) {
      return res.status(400).json({ success: false, message: "Customer ID required" });
    }

    /* ---------- DELIVERY CHARGE LOGIC ---------- */
    const deliveryConfig = await DeliveryCharge.findOne({
      pincode: shippingAddress.pincode
    });
    const baseDeliveryCharge = deliveryConfig ? deliveryConfig.charge : 40;

    let totalProductAmount = 0;
    let finalDeliveryCharge = 0;
    let sellerWiseSplit = {};

    /* ---------- ITEM LOOP & DATA PREPARATION ---------- */
    const processedItems = items.map(item => {
      // 🌟 Safety: Ensure price and quantity are numbers
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      const itemCost = price * quantity;
      
      totalProductAmount += itemCost;

      const actualSellerId = item.sellerId || item.seller || "admin_seller";
      const sellerIdStr = actualSellerId.toString();

      if (!sellerWiseSplit[sellerIdStr]) {
        sellerWiseSplit[sellerIdStr] = {
          sellerId: sellerIdStr,
          items: [],
          sellerSubtotal: 0,
          deliveryChargeApplied: baseDeliveryCharge
        };
        finalDeliveryCharge += baseDeliveryCharge;
      }

      if (item.isFreeDeliveryBySeller) {
        finalDeliveryCharge -= sellerWiseSplit[sellerIdStr].deliveryChargeApplied;
        sellerWiseSplit[sellerIdStr].deliveryChargeApplied = 0;
      }

      sellerWiseSplit[sellerIdStr].sellerSubtotal += itemCost;
      sellerWiseSplit[sellerIdStr].items.push(item);

      return {
        productId: item._id || item.productId,
        name: item.name,
        quantity: quantity,
        price: price,
        sellerId: sellerIdStr,
        image: item.image || item.displayImage
      };
    });

    /* ---------- PAYMENT STATUS & ORDER STATUS ---------- */
    const paymentStatus = paymentMethod === 'WALLET' ? 'Paid' : 'Pending';
    const orderStatus = paymentMethod === 'WALLET' ? 'Placed' : 'Pending';

    const newOrder = new Order({
      customerId,
      items: processedItems,
      sellerSplitData: Object.values(sellerWiseSplit),
      totalAmount: totalProductAmount + finalDeliveryCharge,
      deliveryChargeApplied: finalDeliveryCharge,
      paymentMethod,
      paymentStatus,
      shippingAddress: {
        flatNo: shippingAddress.flatNo,
        addressLine: shippingAddress.addressLine,
        pincode: shippingAddress.pincode,
        label: shippingAddress.label || 'Home',
        receiverName: shippingAddress.receiverName || 'Customer'
      },
      status: orderStatus
    });

    await newOrder.save();

    return res.status(201).json({
      success: true,
      order: newOrder
    });

  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
    2️⃣ UPDATE ORDER STATUS
===================================================== */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };
    
    if (status === 'Delivered') {
      updateData.paymentStatus = 'Paid';
    }

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      updateData,
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (status === 'Delivered') {
      const adminCommPercent = 10;
      for (let split of order.sellerSplitData) {
        const commission = (split.sellerSubtotal * adminCommPercent) / 100;
        const finalSellerPay = (split.sellerSubtotal + split.deliveryChargeApplied) - commission;

        await Payout.create({
          orderId: order._id,
          sellerId: split.sellerId,
          totalOrderAmount: split.sellerSubtotal,
          adminCommission: commission,
          deliveryCharges: split.deliveryChargeApplied,
          sellerSettlementAmount: finalSellerPay,
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
    3️⃣ CANCEL ORDER + REFUND
===================================================== */
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (order.paymentStatus === 'Paid' && order.status !== 'Cancelled') {
      const user = await User.findById(order.customerId);
      if (user) {
        user.walletBalance += order.totalAmount;
        user.walletTransactions.unshift({
          amount: order.totalAmount,
          type: 'CREDIT',
          reason: `Refund for Order #${order._id.toString().slice(-6)}`,
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

/* =====================================================
    4️⃣ GET ORDERS
===================================================== */
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getMyOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({
      customerId: userId,
      status: { $ne: "Pending" } 
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getSellerOrders = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const orders = await Order.find({
      "sellerSplitData.sellerId": sellerId,
      status: { $ne: 'Pending' }
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};
