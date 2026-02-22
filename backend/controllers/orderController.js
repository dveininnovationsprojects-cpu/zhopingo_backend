const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryCharge = require('../models/DeliveryCharge');
const Payout = require('../models/Payout');
const axios = require('axios');
const mongoose = require('mongoose');

const DELHI_TOKEN = "9b44fee45422e3fe8073dee9cfe7d51f9fff7629";
const DELHI_URL_CREATE = "https://staging-express.delhivery.com/api/cmu/create.json";
const DELHI_URL_TRACK = "https://track.delhivery.com/api/v1/packages/json/";

/* =====================================================
    🚚 DELHIVERY SHIPMENT HELPER (Dynamic & Production Ready)
===================================================== */
const createDelhiveryShipment = async (order, customerPhone) => {
  try {
    // 🌟 Dynamic HSN Logic: உன் ப்ராடக்ட் டேட்டாவில் இருந்து HSN எடுக்கிறோம்
    const itemHSN = order.items?.[0]?.hsnCode || order.items?.[0]?.hsn || "0000";

    const shipmentData = {
      "shipments": [{
        "name": order.shippingAddress?.receiverName || "Customer",
        // 🌟 அட்ரஸை டெல்லிவரி ஏற்கும் வகையில் கச்சிதமாக மாற்றியுள்ளேன்
        "add": `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || order.shippingAddress?.area || "Testing Street"}`,
        "pin": order.shippingAddress?.pincode || "110001",
        "phone": customerPhone,
        "order": order._id.toString(),
        "payment_mode": "Pre-paid", 
        "amount": order.totalAmount,
        "weight": 0.5,
        "hsn_code": itemHSN
      }],
      "pickup_location": { "name": "benjamin" } 
    };

    const finalData = `format=json&data=${JSON.stringify(shipmentData)}`;
    const response = await axios.post(DELHI_URL_CREATE, finalData, {
      headers: { 
        'Authorization': `Token ${DELHI_TOKEN}`, 
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log("--- Delhivery Response ---", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("❌ Delhivery API Error:", error.response?.data || error.message);
    return null;
  }
};

// exports.createOrder = async (req, res) => {
//   try {
//     const { items, customerId, shippingAddress, paymentMethod } = req.body;

//     // 🌟 Delivery Config செக் பண்றோம்
//     const deliveryConfig = await DeliveryCharge.findOne({ pincode: shippingAddress.pincode });
//     const BASE_SHIPPING = deliveryConfig ? deliveryConfig.charge : 40;

//     let sellerWiseSplit = {};
//     let mrpTotal = 0;
//     let sellingPriceTotal = 0;

//     const processedItems = items.map(item => {
    
//       const rawId = item.sellerId || item.seller || "698089341dc4f60f934bb5eb";
//       const validSellerId = new mongoose.Types.ObjectId(rawId?._id || rawId);

//       mrpTotal += (Number(item.mrp) || Number(item.price)) * item.quantity;
//       sellingPriceTotal += Number(item.price) * item.quantity;

//       const sIdStr = validSellerId.toString();
//       if (!sellerWiseSplit[sIdStr]) {
//         sellerWiseSplit[sIdStr] = {
//           sellerId: validSellerId,
//           sellerSubtotal: 0,
//           actualShippingCost: BASE_SHIPPING,
//           customerChargedShipping: 0
//         };
//       }
//       sellerWiseSplit[sIdStr].sellerSubtotal += (Number(item.price) * item.quantity);

//       return {
//         productId: new mongoose.Types.ObjectId(item.productId || item._id),
//         name: item.name,
//         quantity: Number(item.quantity),
//         price: Number(item.price),
//         mrp: Number(item.mrp) || Number(item.price),
//         sellerId: validSellerId,
//         image: item.image || ""
//       };
//     });

//     let totalShipping = 0;
//     Object.keys(sellerWiseSplit).forEach(sId => {
//         if(sellerWiseSplit[sId].sellerSubtotal < 500) {
//             sellerWiseSplit[sId].customerChargedShipping = BASE_SHIPPING;
//             totalShipping += BASE_SHIPPING;
//         }
//     });

//     const newOrder = new Order({
//       customerId: new mongoose.Types.ObjectId(customerId), 
//       items: processedItems,
//       sellerSplitData: Object.values(sellerWiseSplit),
//       billDetails: {
//         mrpTotal,
//         itemTotal: sellingPriceTotal,
//         handlingCharge: 2,
//         deliveryCharge: totalShipping,
//         productDiscount: mrpTotal - sellingPriceTotal
//       },
//       totalAmount: sellingPriceTotal + 2 + totalShipping,
//       paymentMethod,
//       shippingAddress: {
//         receiverName: shippingAddress.receiverName,
//         flatNo: shippingAddress.flatNo,
//         addressLine: shippingAddress.addressLine, 
//         pincode: shippingAddress.pincode,
//         label: shippingAddress.label 
//       },
//       status: 'Placed'
//     });

//     await newOrder.save();
//     res.status(201).json({ success: true, order: newOrder });
//   } catch (err) {
//     console.error("Order Create Error:", err.message);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

/* =====================================================
    🌟 CREATE ORDER (With Automatic Wallet Tracking)
===================================================== */
exports.createOrder = async (req, res) => {
  try {
    const { items, customerId, shippingAddress, paymentMethod } = req.body;

    const deliveryConfig = await DeliveryCharge.findOne({ pincode: shippingAddress.pincode });
    const BASE_SHIPPING = deliveryConfig ? deliveryConfig.charge : 40;

    let sellerWiseSplit = {};
    let mrpTotal = 0;
    let sellingPriceTotal = 0;

    const processedItems = items.map(item => {
      const rawId = item.sellerId || item.seller || "698089341dc4f60f934bb5eb";
      const validSellerId = new mongoose.Types.ObjectId(rawId?._id || rawId);

      mrpTotal += (Number(item.mrp) || Number(item.price)) * item.quantity;
      sellingPriceTotal += Number(item.price) * item.quantity;

      const sIdStr = validSellerId.toString();
      if (!sellerWiseSplit[sIdStr]) {
        sellerWiseSplit[sIdStr] = {
          sellerId: validSellerId,
          sellerSubtotal: 0,
          actualShippingCost: BASE_SHIPPING,
          customerChargedShipping: 0
        };
      }
      sellerWiseSplit[sIdStr].sellerSubtotal += (Number(item.price) * item.quantity);

      return {
        productId: new mongoose.Types.ObjectId(item.productId || item._id),
        name: item.name,
        quantity: Number(item.quantity),
        price: Number(item.price),
        mrp: Number(item.mrp) || Number(item.price),
        sellerId: validSellerId,
        image: item.image || "",
        hsnCode: item.hsnCode || item.hsn || "0000" // 👈 HSN-ஐ இங்கே சேமிக்கிறோம்
      };
    });

    let totalShipping = 0;
    Object.keys(sellerWiseSplit).forEach(sId => {
        if(sellerWiseSplit[sId].sellerSubtotal < 500) {
            sellerWiseSplit[sId].customerChargedShipping = BASE_SHIPPING;
            totalShipping += BASE_SHIPPING;
        }
    });

    const newOrder = new Order({
      customerId: new mongoose.Types.ObjectId(customerId), 
      items: processedItems,
      sellerSplitData: Object.values(sellerWiseSplit),
      billDetails: { mrpTotal, itemTotal: sellingPriceTotal, handlingCharge: 2, deliveryCharge: totalShipping, productDiscount: mrpTotal - sellingPriceTotal },
      totalAmount: sellingPriceTotal + 2 + totalShipping,
      paymentMethod,
      shippingAddress: {
        receiverName: shippingAddress.receiverName,
        flatNo: shippingAddress.flatNo,
        addressLine: shippingAddress.addressLine || shippingAddress.area, 
        pincode: shippingAddress.pincode,
        label: shippingAddress.label 
      },
      status: 'Placed'
    });

    await newOrder.save();

    // 🌟 🌟 🌟 வாலட் பேமெண்ட் என்றால் உடனே டெல்லிவரிக்கு அனுப்பு 🌟 🌟 🌟
    if (paymentMethod === "WALLET") {
      const user = await User.findById(customerId);
      newOrder.paymentStatus = "Paid";
      
      const delhiRes = await createDelhiveryShipment(newOrder, user?.phone || "9876543210");
      
      if (delhiRes && (delhiRes.success === true || delhiRes.packages?.length > 0)) {
        newOrder.awbNumber = delhiRes.packages[0].waybill;
      } else {
        newOrder.awbNumber = `TEST-${Date.now()}`; // ஏபிஐ பெயில் ஆனால் பேக்கப் ஐடி
      }
      await newOrder.save();
    }

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
/* =====================================================
    ⚡ BYPASS / TEST PAYMENT
===================================================== */
exports.bypassPaymentAndShip = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if(!order) return res.status(404).json({ success: false, message: "Order not found" });

        const user = await User.findById(order.customerId);
        order.paymentStatus = "Paid";
        order.status = "Placed";

        const delhiRes = await createDelhiveryShipment(order, user?.phone || "9876543210");
        
        if (delhiRes && (delhiRes.success === true || delhiRes.packages?.length > 0)) {
            order.awbNumber = delhiRes.packages?.[0]?.waybill;
            console.log("SUCCESS: AWB Assigned:", order.awbNumber);
        } else {
            order.awbNumber = `TEST-${Date.now()}`;
            console.log("FAILED: Delhivery Error, assigned TEST ID");
        }
        
        await order.save();
        return res.json({ success: true, message: "Test Payment Success & AWB Assigned", data: order });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.params.userId })
            .populate('items.productId')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('customerId', 'name phone email')
            .populate('items.productId')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getSellerOrders = async (req, res) => {
    try {
        const orders = await Order.find({ "items.sellerId": req.params.sellerId })
            .populate('customerId', 'name phone')
            .populate('items.productId')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
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
    }
    await order.save();
    res.json({ success: true, data: order });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    order.status = 'Cancelled';
    order.paymentStatus = 'Refunded';
    await order.save();
    res.json({ success: true, message: "Order Cancelled Successfully" });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.trackDelhivery = async (req, res) => {
    try {
        const response = await axios.get(`${DELHI_URL_TRACK}?waybill=${req.params.awb}`, {
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        res.json({ success: true, tracking: response.data });
    } catch (err) { res.status(500).json({ success: false, message: "Tracking API failed" }); }
};