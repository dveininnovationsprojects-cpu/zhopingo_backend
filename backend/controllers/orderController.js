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
            headers: {
                'Authorization': `Token ${DELHI_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error("Delhivery API Error:", error.response?.data || error.message);
        return null;
    }
};

/* =====================================================
    1️⃣ CUSTOMER: Create Order (Initial State: Pending)
===================================================== */
exports.createOrder = async (req, res) => {
  try {
    const { items, customerId, shippingAddress, paymentMethod } = req.body;
    if (!items?.length) return res.status(400).json({ success: false, message: "Cart is empty" });

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

      // 🖼️ 100% IMAGE FIX: (ஆர்டர் போடும்போதே இமேஜ் பாத்-ஐ சேவ் பண்றோம்)
      let finalImg = item.image || (item.images && item.images[0]) || (item.productId?.images && item.productId.images[0]) || "";
      
      if (finalImg && !finalImg.startsWith('http')) {
          const fileName = finalImg.split('/').pop();
          finalImg = `${DOMAIN}/uploads/products/${fileName}`;
      }

      return {
        productId: item._id || item.productId,
        name: item.name,
        quantity, price, mrp,
        sellerId: actualSellerId,
        image: finalImg // 🌟 இங்க தான் இமேஜ் சேவ் ஆகுது
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
      paymentStatus: 'Pending',
      status: 'Pending', 
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
    2️⃣ BYPASS: Payment Success Logic (Triggers Delivery)
===================================================== */
exports.bypassPaymentAndShip = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if(!order) return res.status(404).json({ success: false, message: "Order not found" });

        const user = await User.findById(order.customerId);

        // 🌟 Update state to Placed (Paid)
        order.status = "Placed";
        order.paymentStatus = "Paid";

        const delhiRes = await createDelhiveryShipment(order, user?.phone || "0000000000");
        
        if (delhiRes?.packages?.[0]) {
            order.awbNumber = delhiRes.packages[0].waybill;
            
            // 🕒 Real ETA Fetch
            try {
                const track = await axios.get(`${DELHI_URL_TRACK}?waybill=${order.awbNumber}`, {
                    headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
                });
                const eta = track.data?.ShipmentData?.[0]?.Shipment?.ExpectedDeliveryDate;
                order.arrivedIn = eta ? new Date(eta).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : "3-5 Days";
            } catch (e) {
                order.arrivedIn = "Fast Delivery";
            }
        }
        
        await order.save();
        res.json({ success: true, message: "Payment Successful & Shipped", data: order });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/* =====================================================
    3️⃣ SELLER/ADMIN: Update Status
===================================================== */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.status = status;

    if (status === 'Delivered') {
      order.paymentStatus = 'Paid';
      order.arrivedIn = "Delivered";
      
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

    await order.save();
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
    4️⃣ ALL: Tracking & Getters
===================================================== */
exports.trackDelhivery = async (req, res) => {
    try {
        const { awb } = req.params;
        const response = await axios.get(`${DELHI_URL_TRACK}?waybill=${awb}`, {
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        res.json({ success: true, tracking: response.data });
    } catch (err) {
        res.status(500).json({ success: false, message: "Tracking fetch failed" });
    }
};

exports.getMyOrders = async (req, res) => {
  try {
    // 🌟 Product இமேஜ் வர productId-ஐ populate செய்கிறோம்
    const orders = await Order.find({ customerId: req.params.userId }).populate('items.productId').sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getSellerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ "items.sellerId": req.params.sellerId, status: { $ne: 'Pending' } }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('customerId', 'name phone').sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
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
    order.paymentStatus = 'Cancelled';
    await order.save();
    res.json({ success: true, message: "Order cancelled" });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};