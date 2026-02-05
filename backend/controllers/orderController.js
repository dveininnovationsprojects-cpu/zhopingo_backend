// const Order = require('../models/Order');
// const User = require('../models/User');
// const DeliveryCharge = require('../models/DeliveryCharge');
// const Payout = require('../models/Payout');
// const Seller = require("../models/Seller");

// // 🌟 1. CREATE ORDER (With Fixed Multi-Seller Logic)
// exports.createOrder = async (req, res) => {
//   try {
//     const { items, customerId, shippingAddress, paymentMethod } = req.body;

//     if (!items || !items.length)
//       return res.status(400).json({ success: false, message: "Cart is empty" });

//     if (!customerId)
//       return res.status(400).json({ success: false, message: "Customer ID required" });

//     if (!shippingAddress?.pincode)
//       return res.status(400).json({ success: false, message: "Pincode required" });

//     const deliveryConfig = await DeliveryCharge.findOne({
//       pincode: shippingAddress.pincode
//     });

//     const baseDeliveryCharge = deliveryConfig ? deliveryConfig.charge : 40;

//     let totalProductAmount = 0;
//     let finalDeliveryCharge = 0;
//     let sellerWiseSplit = {};

//     for (const item of items) {
//       const actualSeller =
//         item.sellerId || item.seller || item._doc?.seller;

//       if (!actualSeller) {
//         return res.status(400).json({
//           success: false,
//           message: `Seller missing for ${item.name}`
//         });
//       }

//       const sellerIdStr =
//         typeof actualSeller === 'object'
//           ? actualSeller._id.toString()
//           : actualSeller.toString();

//       if (!sellerWiseSplit[sellerIdStr]) {
//         const seller = await Seller.findById(sellerIdStr);
//         sellerWiseSplit[sellerIdStr] = {
//           sellerId: sellerIdStr,
//           shopName: seller?.shopName || "Zhopingo Store",
//           items: [],
//           sellerSubtotal: 0,
//           deliveryChargeApplied: baseDeliveryCharge
//         };
//         finalDeliveryCharge += baseDeliveryCharge;
//       }

//       if (item.isFreeDeliveryBySeller) {
//         finalDeliveryCharge -= sellerWiseSplit[sellerIdStr].deliveryChargeApplied;
//         sellerWiseSplit[sellerIdStr].deliveryChargeApplied = 0;
//       }

//       const itemCost = Number(item.price) * Number(item.quantity);
//       totalProductAmount += itemCost;
//       sellerWiseSplit[sellerIdStr].sellerSubtotal += itemCost;
//       sellerWiseSplit[sellerIdStr].items.push(item);
//     }

//     const newOrder = new Order({
//       customerId,
//       items,
//       sellerSplitData: Object.values(sellerWiseSplit),
//       totalAmount: totalProductAmount + finalDeliveryCharge,
//       deliveryChargeApplied: finalDeliveryCharge,
//       paymentMethod,
//       shippingAddress,
//       status: paymentMethod === 'WALLET' ? 'Placed' : 'Pending'

//     });

//     await newOrder.save();

//     res.status(201).json({ success: true, order: newOrder });

//   } catch (err) {
//     console.error("ORDER ERROR:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// // 🌟 2. UPDATE STATUS & PAYOUT GENERATION
// exports.updateOrderStatus = async (req, res) => {
//     try {
//         const { status } = req.body;
//         const order = await Order.findByIdAndUpdate(req.params.orderId, { status }, { new: true });
        
//         if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//         if (status === 'Delivered') {
//             let adminCommPercent = 10; 
            
//             for (let split of order.sellerSplitData) {
//                 let commission = (split.sellerSubtotal * adminCommPercent) / 100;
//                 let finalSellerPay = split.sellerSubtotal - commission;

//                 await Payout.create({
//                     orderId: order._id, 
//                     sellerId: split.sellerId, 
//                     totalOrderAmount: split.sellerSubtotal,
//                     adminCommission: commission, 
//                     deliveryCharges: split.deliveryChargeApplied,
//                     sellerSettlementAmount: finalSellerPay,
//                     status: 'Pending'
//                 });
//             }
//         }
//         res.json({ success: true, data: order });
//     } catch (err) { 
//         res.status(500).json({ success: false, error: err.message }); 
//     }
// };

// // 🌟 3. CANCEL ORDER & WALLET REFUND
// exports.cancelOrder = async (req, res) => {
//     try {
//         const order = await Order.findById(req.params.orderId);
//         if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//         // COD தவிர மற்ற पेमेंट முறைகளுக்கு ரீஃபண்ட்
//         if (order.paymentMethod !== 'COD' && order.status !== 'Cancelled') {
//             const user = await User.findById(order.customerId);
//             if (user) {
//                 user.walletBalance += order.totalAmount;
//                 user.walletTransactions.unshift({ 
//                     amount: order.totalAmount, 
//                     type: 'CREDIT', 
//                     reason: `Refund for Order #${order._id}`, 
//                     date: new Date() 
//                 });
//                 await user.save();
//             }
//         }

//         order.status = 'Cancelled';
//         await order.save();
//         res.json({ success: true, message: "Order cancelled and refund processed." });
//     } catch (err) { 
//         res.status(500).json({ success: false, error: err.message }); 
//     }
// };

// // 🌟 4. GET APIS (Admin, User & Seller)
// exports.getOrders = async (req, res) => {
//     try {
//         const orders = await Order.find().populate('customerId', 'name phone').sort({ createdAt: -1 });
//         res.json({ success: true, data: orders });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// exports.getMyOrders = async (req, res) => {
//     try {
//         const orders = await Order.find({ customerId: req.params.userId }).sort({ createdAt: -1 });
//         res.json({ success: true, data: orders });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// exports.getSellerOrders = async (req, res) => {
//     try {
//         const { sellerId } = req.params;
//         const orders = await Order.find({ 
//             "sellerSplitData.sellerId": sellerId,
//             status: { $ne: 'Pending' }
//         }).sort({ createdAt: -1 });
//         res.json({ success: true, data: orders });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };


const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryCharge = require('../models/DeliveryCharge');
const Payout = require('../models/Payout');
const Seller = require("../models/Seller");

/* =====================================================
   1️⃣ CREATE ORDER (MULTI-SELLER + PAYMENT-SAFE LOGIC)
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

    if (!shippingAddress?.pincode) {
      return res.status(400).json({ success: false, message: "Pincode required" });
    }

    /* ---------- DELIVERY CHARGE ---------- */
    const deliveryConfig = await DeliveryCharge.findOne({
      pincode: shippingAddress.pincode
    });

    const baseDeliveryCharge = deliveryConfig ? deliveryConfig.charge : 40;

    let totalProductAmount = 0;
    let finalDeliveryCharge = 0;
    let sellerWiseSplit = {};

    /* ---------- ITEM LOOP ---------- */
    for (const item of items) {
      const actualSeller =
        item.sellerId || item.seller || item._doc?.seller;

      if (!actualSeller) {
        return res.status(400).json({
          success: false,
          message: `Seller missing for ${item.name}`
        });
      }

      const sellerIdStr =
        typeof actualSeller === 'object'
          ? actualSeller._id.toString()
          : actualSeller.toString();

      if (!sellerWiseSplit[sellerIdStr]) {
        const seller = await Seller.findById(sellerIdStr);

        sellerWiseSplit[sellerIdStr] = {
          sellerId: sellerIdStr,
          shopName: seller?.shopName || "Zhopingo Store",
          items: [],
          sellerSubtotal: 0,
          deliveryChargeApplied: baseDeliveryCharge
        };

        finalDeliveryCharge += baseDeliveryCharge;
      }

      /* ---------- FREE DELIVERY ---------- */
      if (item.isFreeDeliveryBySeller) {
        finalDeliveryCharge -= sellerWiseSplit[sellerIdStr].deliveryChargeApplied;
        sellerWiseSplit[sellerIdStr].deliveryChargeApplied = 0;
      }

      const itemCost = Number(item.price) * Number(item.quantity);
      totalProductAmount += itemCost;

      sellerWiseSplit[sellerIdStr].sellerSubtotal += itemCost;
      sellerWiseSplit[sellerIdStr].items.push(item);
    }

    /* ---------- ORDER STATUS RULE ---------- */
    const orderStatus =
      paymentMethod === 'WALLET' ? 'Placed' : 'Pending';

    const newOrder = new Order({
      customerId,
      items,
      sellerSplitData: Object.values(sellerWiseSplit),
      totalAmount: totalProductAmount + finalDeliveryCharge,
      deliveryChargeApplied: finalDeliveryCharge,
      paymentMethod,
      shippingAddress,
      status: orderStatus
    });

    await newOrder.save();

    return res.status(201).json({
      success: true,
      order: newOrder
    });

  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

/* =====================================================
   2️⃣ UPDATE ORDER STATUS (DELIVERY → PAYOUT)
===================================================== */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    /* ---------- PAYOUT ON DELIVERY ---------- */
    if (status === 'Delivered') {
      const adminCommPercent = 10;

      for (let split of order.sellerSplitData) {
        const commission =
          (split.sellerSubtotal * adminCommPercent) / 100;

        const finalSellerPay =
          split.sellerSubtotal - commission;

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
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

/* =====================================================
   3️⃣ CANCEL ORDER + WALLET REFUND
===================================================== */
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (order.paymentMethod !== 'COD' && order.status !== 'Cancelled') {
      const user = await User.findById(order.customerId);

      if (user) {
        user.walletBalance += order.totalAmount;

        user.walletTransactions.unshift({
          amount: order.totalAmount,
          type: 'CREDIT',
          reason: `Refund for Order #${order._id}`,
          date: new Date()
        });

        await user.save();
      }
    }

    order.status = 'Cancelled';
    await order.save();

    res.json({
      success: true,
      message: "Order cancelled and refund processed."
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

/* =====================================================
   4️⃣ GET ORDERS (ADMIN / USER / SELLER)
===================================================== */
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({
    customerId: req.params.userId,
    status: { $ne: "Pending" }   // 🔥 IMPORTANT
  }).sort({ createdAt: -1 });

  res.json({ success: true, data: orders });
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      customerId: req.params.userId,
      status: { $ne: 'Pending' } // ❗ pending hide
    })
    .sort({ createdAt: -1 })
    .lean();

    res.json({
      success: true,
      data: orders
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

