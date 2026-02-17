const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryCharge = require('../models/DeliveryCharge');
const Payout = require('../models/Payout');
const axios = require('axios');

// 🔑 Credentials & Config
const DELHI_TOKEN = "9b44fee45422e3fe8073dee9cfe7d51f9fff7629";
const DELHI_URL_CREATE = "https://track.delhivery.com/api/cmu/create.json";
const DELHI_URL_TRACK = "https://track.delhivery.com/api/v1/packages/json/";
const DOMAIN = "https://api.zhopingo.in";

/* =====================================================
    HELPER: Delhivery Shipment Creation
===================================================== */
const createDelhiveryShipment = async (order, customerPhone) => {
    try {
        const payload = {
            "shipments": [{
                "name": order.shippingAddress?.receiverName || "Customer",
                "add": `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.area || ""}`,
                "pin": order.shippingAddress?.pincode,
                "phone": customerPhone,
                "order": order._id.toString(),
                "payment_mode": order.paymentMethod === 'COD' ? 'Collect' : 'Prepaid',
                "amount": order.totalAmount,
            }],
            "pickup_location": { "name": "ZHOPINGO_PRIMARY_HUB" } 
        };
        const response = await axios.post(DELHI_URL_CREATE, payload, {
            headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        console.error("Logistics API Error:", error.message);
        return null;
    }
};

/* =====================================================
    1️⃣ CUSTOMER: Create Order (Blinkit Multi-Seller Architecture)
===================================================== */
exports.createOrder = async (req, res) => {
  try {
    const { items, customerId, shippingAddress, paymentMethod } = req.body;
    if (!items?.length) return res.status(400).json({ success: false, message: "Cart is empty" });

    const deliveryConfig = await DeliveryCharge.findOne({ pincode: shippingAddress.pincode });
    const BASE_SHIPPING = deliveryConfig ? deliveryConfig.charge : 40;
    const FREE_THRESHOLD = 500; 

    let sellerWiseSplit = {};
    let mrpTotal = 0;
    let sellingPriceTotal = 0;
    const handlingCharge = 2; 

    // 🔄 Grouping Items by Seller to prevent duplicate shipping counts
    const processedItems = items.map(item => {
      const price = Number(item.price) || 0;
      const mrp = Number(item.mrp) || price;
      const qty = Number(item.quantity) || 1;
      
      mrpTotal += mrp * qty;
      sellingPriceTotal += price * qty;
      
      // ✅ Fallback Seller ID (Ensures no 500 error if sellerId is missing)
      const sId = (item.sellerId || item.seller || "698089341dc4f60f934bb5eb").toString();

      if (!sellerWiseSplit[sId]) {
        sellerWiseSplit[sId] = {
          sellerId: sId,
          sellerSubtotal: 0,
          actualShippingCost: BASE_SHIPPING,
          customerChargedShipping: 0 
        };
      }
      sellerWiseSplit[sId].sellerSubtotal += (price * qty);

      // ✅ Safe Image URL construction
      let finalImg = item.image || "";
      if (finalImg && !finalImg.startsWith('http')) {
          const parts = finalImg.split('/');
          finalImg = `${DOMAIN}/uploads/products/${parts[parts.length - 1]}`;
      }

      return {
        productId: item.productId || item._id,
        name: item.name || "Product",
        quantity: qty, price, mrp,
        sellerId: sId,
        image: finalImg
      };
    });

    // 🚚 Logic: Seller wise free delivery check
    let totalCustomerShipping = 0;
    Object.keys(sellerWiseSplit).forEach(sId => {
      if (sellerWiseSplit[sId].sellerSubtotal < FREE_THRESHOLD) {
        sellerWiseSplit[sId].customerChargedShipping = BASE_SHIPPING;
        totalCustomerShipping += BASE_SHIPPING;
      }
    });

    const newOrder = new Order({
      customerId,
      items: processedItems,
      sellerSplitData: Object.values(sellerWiseSplit),
      billDetails: { 
        mrpTotal, 
        itemTotal: sellingPriceTotal, 
        handlingCharge, 
        deliveryCharge: totalCustomerShipping,
        productDiscount: mrpTotal - sellingPriceTotal
      },
      totalAmount: sellingPriceTotal + handlingCharge + totalCustomerShipping,
      paymentMethod,
      shippingAddress,
      status: 'Pending',
      paymentStatus: 'Pending',
      arrivedIn: "Awaiting Payment"
    });

    await newOrder.save();
    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    console.error("Critical: Order Creation Failed:", err.message);
    res.status(500).json({ success: false, error: "Database Sync Error" });
  }
};

/* =====================================================
    2️⃣ BYPASS: Payment Success & Delhivery Trigger
===================================================== */
exports.bypassPaymentAndShip = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if(!order) return res.status(404).json({ success: false, message: "Order not found" });

        const user = await User.findById(order.customerId);
        order.status = "Placed";
        order.paymentStatus = "Paid";

        const delhiRes = await createDelhiveryShipment(order, user?.phone || "0000000000");
        if (delhiRes?.packages?.[0]) {
            order.awbNumber = delhiRes.packages[0].waybill;
            order.arrivedIn = order.shippingAddress?.arrivedIn || "Scheduled";
        }
        
        await order.save();
        res.json({ success: true, message: "Success", data: order });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

/* =====================================================
    3️⃣ DEEP POPULATED GETTERS (Seller + Product + Customer)
===================================================== */
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.params.userId })
            .populate('items.productId') 
            .populate({ path: 'sellerSplitData.sellerId', select: 'shopName logo phone' })
            .sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('customerId', 'name phone email')
            .populate('items.productId')
            .populate({ path: 'sellerSplitData.sellerId', select: 'shopName phone' })
            .sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getSellerOrders = async (req, res) => {
    try {
        const orders = await Order.find({ "items.sellerId": req.params.sellerId, status: { $ne: 'Pending' } })
            .populate('customerId', 'name phone')
            .populate('items.productId')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

/* =====================================================
    4️⃣ COMMON ACTIONS
===================================================== */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Not found" });

    order.status = status;

    if (status === 'Delivered') {
      order.paymentStatus = 'Paid';
      order.arrivedIn = "Delivered";
      
      const ADMIN_COMM_PERCENT = 10;
      for (let split of order.sellerSplitData) {
        const commission = (split.sellerSubtotal * ADMIN_COMM_PERCENT) / 100;
        const sellerSettlement = (split.sellerSubtotal - commission - split.actualShippingCost) + split.customerChargedShipping;

        await Payout.create({
          orderId: order._id,
          sellerId: split.sellerId,
          totalOrderAmount: split.sellerSubtotal,
          adminCommission: commission,
          deliveryChargesDeducted: split.actualShippingCost, 
          sellerSettlementAmount: sellerSettlement,
          status: 'Pending'
        });
      }
    }
    await order.save();
    res.json({ success: true, data: order });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (order.paymentStatus === 'Paid') {
      const user = await User.findById(order.customerId);
      if (user) {
        user.walletBalance += order.totalAmount;
        await user.save();
      }
    }
    order.status = 'Cancelled';
    order.paymentStatus = 'Refunded';
    await order.save();
    res.json({ success: true, message: "Cancelled" });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.trackDelhivery = async (req, res) => {
    try {
        const response = await axios.get(`${DELHI_URL_TRACK}?waybill=${req.params.awb}`, {
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        res.json({ success: true, tracking: response.data });
    } catch (err) { res.status(500).json({ success: false, message: "Failed" }); }
};