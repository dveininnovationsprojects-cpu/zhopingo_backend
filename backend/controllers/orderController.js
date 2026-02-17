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
                "name": order.shippingAddress.receiverName || "Customer",
                "add": `${order.shippingAddress.flatNo}, ${order.shippingAddress.area}`,
                "pin": order.shippingAddress.pincode,
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
        console.error("Delhivery API Error:", error.message);
        return null;
    }
};

/* =====================================================
    1️⃣ CUSTOMER: Create Order (Blinkit Multi-Seller Logic)
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

    const processedItems = items.map(item => {
      const price = Number(item.price) || 0;
      const mrp = Number(item.mrp) || price;
      const qty = Number(item.quantity) || 1;
      
      mrpTotal += mrp * qty;
      sellingPriceTotal += price * qty;
      const sId = (item.sellerId || item.seller || "admin_seller").toString();

      if (!sellerWiseSplit[sId]) {
        sellerWiseSplit[sId] = {
          sellerId: sId,
          sellerSubtotal: 0,
          actualShippingCost: BASE_SHIPPING_COST, // Admin paying to Delhivery
          customerChargedShipping: 0 // What customer pays
        };
      }
      sellerWiseSplit[sId].sellerSubtotal += (price * qty);

      // Image Path Fix
      let finalImg = item.image || (item.images && item.images[0]) || "";
      if (finalImg && !finalImg.startsWith('http')) {
          finalImg = `${DOMAIN}/uploads/products/${finalImg.split('/').pop()}`;
      }

      return {
        productId: item._id || item.productId,
        name: item.name,
        quantity: qty, price, mrp,
        sellerId: sId,
        image: finalImg
      };
    });

    let totalCustomerShippingCharge = 0;
    Object.values(sellerWiseSplit).forEach(seller => {
      if (seller.sellerSubtotal < FREE_DELIVERY_THRESHOLD) {
        seller.customerChargedShipping = BASE_SHIPPING_COST;
        totalCustomerShippingCharge += BASE_SHIPPING_COST;
      } else {
        seller.customerChargedShipping = 0; // FREE for Customer
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

    await newOrder.save();
    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
    2️⃣ BYPASS & UPDATE STATUS (Payout Logic Included)
===================================================== */
exports.bypassPaymentAndShip = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        const user = await User.findById(order.customerId);
        if(!order) return res.status(404).json({ success: false, message: "Order not found" });

        order.status = "Placed";
        order.paymentStatus = "Paid";

        const delhiRes = await createDelhiveryShipment(order, user?.phone || "0000000000");
        if (delhiRes?.packages?.[0]) {
            order.awbNumber = delhiRes.packages[0].waybill;
        }
        await order.save();
        res.json({ success: true, message: "Paid & Shipped", data: order });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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
        
        // 🌟 SELLER FUNDED LOGIC: 
        // Seller gets = Subtotal - Commission - Admin's Shipping Cost + Customer's Paid Shipping
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
    3️⃣ CANCEL, TRACK, GETTERS
===================================================== */

// 🚨 Missing cancelOrder function added back to fix the TypeError
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
    res.json({ success: true, message: "Order cancelled and refund processed" });
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

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.params.userId }).populate('items.productId').sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('customerId', 'name phone').sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getSellerOrders = async (req, res) => {
    try {
        const orders = await Order.find({ "items.sellerId": req.params.sellerId, status: { $ne: 'Pending' } }).sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};