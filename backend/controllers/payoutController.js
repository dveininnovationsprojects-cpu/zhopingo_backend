const Payout = require('../models/Payout');
const Order = require('../models/Order');

exports.calculateOrderPayout = async (orderId) => {
    try {
        const order = await Order.findById(orderId);
        if (!order || order.status !== 'Delivered') return;

        let adminCommissionRate = 0.10; 

        for (let item of order.items) {
            let itemTotal = item.price * item.quantity;
            let commission = itemTotal * adminCommissionRate;
            
          
            let deliveryDeduction = item.isFreeDeliveryBySeller ? order.deliveryChargeApplied : 0;

            let finalSellerPayout = itemTotal - commission - deliveryDeduction;

            await Payout.create({
                orderId: order._id,
                sellerId: item.sellerId,
                totalOrderAmount: itemTotal,
                adminCommission: commission,
                deliveryCharges: deliveryDeduction,
                sellerSettlementAmount: finalSellerPayout,
                status: 'Pending'
            });
        }
    } catch (err) {
        console.error("Payout logic failed:", err.message);
    }
};