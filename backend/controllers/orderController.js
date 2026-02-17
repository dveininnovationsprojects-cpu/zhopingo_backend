const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryCharge = require('../models/DeliveryCharge');
const Payout = require('../models/Payout');
const axios = require('axios');

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
        console.error("Delhivery API Error:", error.response?.data || error.message);
        return null;
    }
};

/* =====================================================
    1️⃣ CUSTOMER: Create Order (Multi-Seller Stable Logic)
===================================================== */
exports.createOrder = async (req, res) => {
  try {
    const { items, customerId, shippingAddress, paymentMethod } = req.body;
    if (!items?.length) return res.status(400).json({ success: false, message: "Cart is empty" });

    const deliveryConfig = await DeliveryCharge.findOne({ pincode: shippingAddress.pincode });
    const BASE_SHIPPING_COST = deliveryConfig ? deliveryConfig.charge : 40;
    const FREE_DELIVERY_THRESHOLD = 500; 

    let sellerWiseSplit = {};
    let mrpTotal = 0;
    let sellingPriceTotal = 0;
    const handlingCharge = 2; 

    // ✅ Step 1: Process and Group by Seller
    const processedItems = items.map(item => {
      const price = Number(item.price) || 0;
      const mrp = Number(item.mrp) || price;
      const qty = Number(item.quantity) || 1;
      
      mrpTotal += mrp * qty;
      sellingPriceTotal += price * qty;
      
      // Fallback ID if sellerId is missing to avoid 500 error
      const sId = (item.sellerId || item.seller || "698089341dc4f60f934bb5eb").toString();

      if (!sellerWiseSplit[sId]) {
        sellerWiseSplit[sId] = {
          sellerId: sId,
          sellerSubtotal: 0,
          actualShippingCost: BASE_SHIPPING_COST,
          customerChargedShipping: 0 
        };
      }
      sellerWiseSplit[sId].sellerSubtotal += (price * qty);

      // Image Handling
      let finalImg = item.image || (item.images && item.images[0]) || "";
      if (finalImg && !finalImg.startsWith('http')) {
          const parts = finalImg.split('/');
          finalImg = `${DOMAIN}/uploads/products/${parts[parts.length - 1]}`;
      }

      return {
        productId: item._id || item.productId,
        name: item.name,
        quantity: qty, price, mrp,
        sellerId: sId,
        image: finalImg
      };
    });

    // ✅ Step 2: Calculate Delivery Charges (Fixed Calculation)
    let totalCustomerShippingCharge = 0;
    Object.keys(sellerWiseSplit).forEach(sId => {
      const seller = sellerWiseSplit[sId];
      if (seller.sellerSubtotal < FREE_DELIVERY_THRESHOLD) {
        seller.customerChargedShipping = BASE_SHIPPING_COST;
        totalCustomerShippingCharge += BASE_SHIPPING_COST;
      } else {
        seller.customerChargedShipping = 0; 
      }
    });

    const grandTotal = sellingPriceTotal + handlingCharge + totalCustomerShippingCharge;

    const newOrder = new Order({
      customerId,
      items: processedItems,
      sellerSplitData: Object.values(sellerWiseSplit),
      billDetails: { 
        mrpTotal, 
        itemTotal: sellingPriceTotal, 
        handlingCharge, 
        deliveryCharge: totalCustomerShippingCharge,
        productDiscount: mrpTotal - sellingPriceTotal
      },
      totalAmount: grandTotal,
      paymentMethod,
      status: 'Pending',
      paymentStatus: 'Pending',
      shippingAddress,
      arrivedIn: "Awaiting Payment"
    });

    const savedOrder = await newOrder.save();
    res.status(201).json({ success: true, order: savedOrder });
  } catch (err) {
    console.error("Create Order Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
    2️⃣ STATUS UPDATES (With Await Fix)
===================================================== */
exports.bypassPaymentAndShip = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if(!order) return res.status(404).json({ success: false, message: "Order not found" });

        const user = await User.findById(order.customerId);

        order.status = "Placed";
        order.paymentStatus = "Paid";

        // ✅ Step: Register with Delhivery
        const delhiRes = await createDelhiveryShipment(order, user?.phone || "0000000000");
        if (delhiRes && delhiRes.packages && delhiRes.packages[0]) {
            order.awbNumber = delhiRes.packages[0].waybill;
            order.arrivedIn = order.shippingAddress?.arrivedIn || "Fast Delivery";
        }
        
        await order.save();
        res.json({ success: true, message: "Paid & Shipped", data: order });
    } catch (err) { 
        console.error("Bypass Error:", err);
        res.status(500).json({ success: false, error: err.message }); 
    }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Not found" });

    order.status = status;

    if (status === 'Delivered') {
      order.paymentStatus = 'Paid';
      order.arrivedIn = "Delivered";
      
      const ADMIN_COMMISSION_PERCENT = 10;
      for (let split of order.sellerSplitData) {
        const commission = (split.sellerSubtotal * ADMIN_COMMISSION_PERCENT) / 100;
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

/* =====================================================
    3️⃣ DEEP POPULATED GETTERS
===================================================== */
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.params.userId })
            .populate('items.productId')
            .populate({ path: 'sellerSplitData.sellerId', select: 'name shopName logo phone' })
            .sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('customerId', 'name phone email')
            .populate('items.productId')
            .populate({ path: 'sellerSplitData.sellerId', select: 'shopName ownerName phone' })
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

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

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
    res.json({ success: true, message: "Order cancelled" });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.trackDelhivery = async (req, res) => {
    try {
        const response = await axios.get(`${DELHI_URL_TRACK}?waybill=${req.params.awb}`, {
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        res.json({ success: true, tracking: response.data });
    } catch (err) { res.status(500).json({ success: false, message: "Tracking failed" }); }
};