const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryCharge = require('../models/DeliveryCharge');
const Payout = require('../models/Payout');
const axios = require('axios');

const DELHI_TOKEN = "9b44fee45422e3fe8073dee9cfe7d51f9fff7629";
const DELHI_URL_CREATE = "https://track.delhivery.com/api/cmu/create.json";
const DELHI_URL_TRACK = "https://track.delhivery.com/api/v1/packages/json/";

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
            headers: {
                'Authorization': `Token ${DELHI_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error("Delhivery Create Error:", error.response ? error.response.data : error.message);
        return null;
    }
};

/* =====================================================
    1️⃣ CREATE ORDER
===================================================== */
exports.createOrder = async (req, res) => {
  try {
    const { items, customerId, shippingAddress, paymentMethod } = req.body;
    if (!items || !items.length) return res.status(400).json({ success: false, message: "Cart is empty" });

    const userObj = await User.findById(customerId);
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
        quantity, price, mrp,
        sellerId: actualSellerId,
        image: item.image || (item.images && item.images[0])
      };
    });

    const totalDeliveryCharge = Object.values(sellerWiseSplit).reduce((acc, curr) => acc + curr.deliveryChargeApplied, 0);
    const grandTotal = sellingPriceTotal + handlingCharge + totalDeliveryCharge;

    const status = (paymentMethod === 'WALLET' || paymentMethod === 'ONLINE') ? 'Placed' : 'Pending';

    const newOrder = new Order({
      customerId,
      items: processedItems,
      sellerSplitData: Object.values(sellerWiseSplit),
      billDetails: { mrpTotal, productDiscount: mrpTotal - sellingPriceTotal, itemTotal: sellingPriceTotal, handlingCharge, deliveryCharge: totalDeliveryCharge },
      totalAmount: grandTotal,
      paymentMethod,
      paymentStatus: (paymentMethod === 'WALLET' || paymentMethod === 'ONLINE') ? 'Paid' : 'Pending',
      status: status,
      shippingAddress,
      arrivedIn: `${Math.floor(Math.random() * (15 - 8) + 8)} mins`
    });

    await newOrder.save();

    // 🚀 Auto-ship if Placed
    if (status === 'Placed') {
        const delhiRes = await createDelhiveryShipment(newOrder, userObj?.phone || "0000000000");
        if (delhiRes?.packages?.[0]) {
            newOrder.awbNumber = delhiRes.packages[0].waybill;
            await newOrder.save();
        }
    }

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
    2️⃣ BYPASS PAYMENT & SHIP (Testing-kaga Easy Flow)
===================================================== */
exports.bypassPaymentAndShip = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if(!order) return res.status(404).json({ success: false, message: "Order not found" });

        const user = await User.findById(order.customerId);

        order.status = "Placed";
        order.paymentStatus = "Paid";

        const delhiRes = await createDelhiveryShipment(order, user?.phone || "0000000000");
        if (delhiRes?.packages?.[0]) {
            order.awbNumber = delhiRes.packages[0].waybill;
        }
        
        await order.save();
        res.json({ success: true, message: "Payment Bypassed & Delhivery Shipment Created", awb: order.awbNumber });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/* =====================================================
    3️⃣ TRACK SHIPMENT (Real-time from Delhivery)
===================================================== */
exports.trackDelhivery = async (req, res) => {
    try {
        const { awb } = req.params;
        const response = await axios.get(`${DELHI_URL_TRACK}?waybill=${awb}`, {
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        res.json({ success: true, tracking: response.data });
    } catch (err) {
        res.status(500).json({ success: false, message: "Tracking failed" });
    }
};

/* =====================================================
    4️⃣ GET SELLER ORDERS
===================================================== */
exports.getSellerOrders = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const orders = await Order.find({ "items.sellerId": sellerId, status: { $ne: 'Pending' } }).sort({ createdAt: -1 });

    const filteredOrders = orders.map(order => {
        const sellerItems = order.items.filter(i => i.sellerId === sellerId);
        return {
            _id: order._id,
            status: order.status,
            customer: order.customerId, 
            items: sellerItems,
            createdAt: order.createdAt,
            shippingAddress: order.shippingAddress,
            awbNumber: order.awbNumber // Seller-ku AWB katuvom
        };
    });
    res.json({ success: true, data: filteredOrders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
    5️⃣ UPDATE STATUS, GET MY ORDERS, CANCEL
===================================================== */
exports.getOrders = async (req, res) => {
    try {
      const orders = await Order.find().populate('customerId', 'name phone').sort({ createdAt: -1 });
      res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.orderId, { status }, { new: true });
    
    if (status === 'Delivered') {
        // Payout Logic... (existing)
    }
    res.json({ success: true, data: order });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.userId, status: { $ne: "Pending" } }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    order.status = 'Cancelled';
    await order.save();
    res.json({ success: true, message: "Order cancelled" });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};