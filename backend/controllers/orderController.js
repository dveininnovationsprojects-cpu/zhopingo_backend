const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryCharge = require('../models/DeliveryCharge');
const Payout = require('../models/Payout'); 


exports.createOrder = async (req, res) => {
    try {
        const { items, customerId, shippingAddress, paymentMethod } = req.body;

        if (!shippingAddress?.pincode) return res.status(400).json({ message: "Pincode required" });

        const deliveryConfig = await DeliveryCharge.findOne({ pincode: shippingAddress.pincode });
        let baseDeliveryCharge = deliveryConfig ? deliveryConfig.charge : 50; 

        let totalProductAmount = 0;
        let sellerFreeDeliveryApplied = false;

        items.forEach(item => {
            totalProductAmount += (item.price * item.quantity);
            if (item.isFreeDeliveryBySeller) sellerFreeDeliveryApplied = true;
        });

        let customerDeliveryCharge = sellerFreeDeliveryApplied ? 0 : baseDeliveryCharge;
        let finalOrderAmount = totalProductAmount + customerDeliveryCharge;

        if (paymentMethod === 'WALLET') {
            const user = await User.findById(customerId);
            if (user.walletBalance < finalOrderAmount) return res.status(400).json({ message: "Insufficient Balance" });
            user.walletBalance -= finalOrderAmount;
            user.walletTransactions.unshift({ amount: finalOrderAmount, type: 'DEBIT', reason: `Order Payment`, date: new Date() });
            await user.save();
        }

        const newOrder = new Order({
            customerId, items, totalAmount: finalOrderAmount, deliveryChargeApplied: baseDeliveryCharge,
            paymentMethod, shippingAddress, status: paymentMethod === 'ONLINE' ? 'Pending' : 'Placed' 
        });
        await newOrder.save();
        res.status(201).json({ success: true, order: newOrder });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// 2. GET ALL ORDERS (Admin)
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('customerId', 'name phone').sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. GET MY ORDERS (User)
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.params.userId }).sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. CANCEL ORDER
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (order.paymentMethod !== 'COD') {
            const user = await User.findById(order.customerId);
            user.walletBalance += order.totalAmount;
            user.walletTransactions.unshift({ amount: order.totalAmount, type: 'CREDIT', reason: `Refund`, date: new Date() });
            await user.save();
        }
        order.status = 'Cancelled';
        await order.save();
        res.json({ success: true, message: "Cancelled" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. UPDATE STATUS & CALCULATE PAYOUT
exports.updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.orderId, { status: req.body.status }, { new: true });
        
        
        if (req.body.status === 'Delivered') {
            let adminCommPercent = 10; 
            for (let item of order.items) {
                let itemTotal = item.price * item.quantity;
                let commission = (itemTotal * adminCommPercent) / 100;
                let deliveryDeduction = item.isFreeDeliveryBySeller ? order.deliveryChargeApplied : 0;
                let finalSellerPay = itemTotal - commission - deliveryDeduction;

                await Payout.create({
                    orderId: order._id, sellerId: item.sellerId, totalOrderAmount: itemTotal,
                    adminCommission: commission, deliveryCharges: deliveryDeduction,
                    sellerSettlementAmount: finalSellerPay
                });
            }
        }
        res.json({ success: true, data: order });
    } catch (err) { res.status(500).json({ error: err.message }); }
};