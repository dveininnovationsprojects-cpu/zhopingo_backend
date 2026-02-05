// const Payout = require('../models/Payout');
// const Order = require('../models/Order');

// exports.calculateOrderPayout = async (orderId) => {
//     try {
//         const order = await Order.findById(orderId);
//         if (!order || order.status !== 'Delivered') return;

//         let adminCommissionRate = 0.10; 

//         for (let item of order.items) {
//             let itemTotal = item.price * item.quantity;
//             let commission = itemTotal * adminCommissionRate;
            
          
//             let deliveryDeduction = item.isFreeDeliveryBySeller ? order.deliveryChargeApplied : 0;

//             let finalSellerPayout = itemTotal - commission - deliveryDeduction;

//             await Payout.create({
//                 orderId: order._id,
//                 sellerId: item.sellerId,
//                 totalOrderAmount: itemTotal,
//                 adminCommission: commission,
//                 deliveryCharges: deliveryDeduction,
//                 sellerSettlementAmount: finalSellerPayout,
//                 status: 'Pending'
//             });
//         }
//     } catch (err) {
//         console.error("Payout logic failed:", err.message);
//     }
// };


const Payout = require('../models/Payout');
const Order = require('../models/Order');

/**
 * 🔥 Blinkit-style payout calculation
 * - One payout per seller per order
 * - Trigger ONLY when order is Delivered
 */
exports.calculateOrderPayout = async (orderId) => {
  try {
    const order = await Order.findById(orderId);

    if (!order || order.status !== 'Delivered') return;

    const ADMIN_COMMISSION_PERCENT = 10; // 10%

    for (const sellerSplit of order.sellerSplitData) {
      const sellerSubtotal = sellerSplit.sellerSubtotal;
      const deliveryCharge = sellerSplit.deliveryChargeApplied || 0;

      const adminCommission =
        (sellerSubtotal * ADMIN_COMMISSION_PERCENT) / 100;

      const sellerSettlementAmount =
        sellerSubtotal - adminCommission - deliveryCharge;

      // 🔁 Avoid duplicate payout
      const existing = await Payout.findOne({
        orderId: order._id,
        sellerId: sellerSplit.sellerId
      });

      if (existing) continue;

      await Payout.create({
        orderId: order._id,
        sellerId: sellerSplit.sellerId,
        totalOrderAmount: sellerSubtotal,
        adminCommission,
        deliveryCharges: deliveryCharge,
        sellerSettlementAmount,
        status: 'Pending'
      });
    }

  } catch (err) {
    console.error("Payout logic failed:", err.message);
  }
};
