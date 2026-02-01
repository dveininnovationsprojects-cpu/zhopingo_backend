const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryCharge = require('../models/DeliveryCharge');
const Payout = require('../models/Payout');

// 1. CREATE ORDER
exports.createOrder = async (req, res) => {
    try {
        const { items, customerId, shippingAddress, paymentMethod } = req.body;

        if (!shippingAddress?.pincode) {
            return res.status(400).json({ success: false, message: "Pincode is required." });
        }

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

        // WALLET PAYMENT LOGIC
        if (paymentMethod === 'WALLET') {
            const user = await User.findById(customerId);
            if (!user || user.walletBalance < finalOrderAmount) {
                return res.status(400).json({ success: false, message: "Insufficient Wallet Balance" });
            }
            user.walletBalance -= finalOrderAmount;
            user.walletTransactions.unshift({ 
                amount: finalOrderAmount, type: 'DEBIT', reason: `Payment for Order`, date: new Date() 
            });
            await user.save();
        }

        // ✅ Constructor Error வராமல் இருக்க இப்போ இது சரியாக வேலை செய்யும்
        const newOrder = new Order({
            customerId, 
            items, 
            totalAmount: finalOrderAmount, 
            deliveryChargeApplied: customerDeliveryCharge,
            paymentMethod, 
            shippingAddress, 
            status: paymentMethod === 'ONLINE' ? 'Pending' : 'Placed' 
        });

        await newOrder.save();
        res.status(201).json({ success: true, order: newOrder });

    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

// 2. UPDATE STATUS & PAYOUT
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.orderId, { status }, { new: true });
        
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (status === 'Delivered') {
            let adminCommPercent = 10; 
            for (let item of order.items) {
                let itemTotal = item.price * item.quantity;
                let commission = (itemTotal * adminCommPercent) / 100;
                let deliveryDeduction = item.isFreeDeliveryBySeller ? order.deliveryChargeApplied : 0;
                let finalSellerPay = itemTotal - commission - deliveryDeduction;

                await Payout.create({
                    orderId: order._id, 
                    sellerId: item.sellerId, 
                    totalOrderAmount: itemTotal,
                    adminCommission: commission, 
                    deliveryCharges: deliveryDeduction,
                    sellerSettlementAmount: finalSellerPay,
                    status: 'Pending'
                });
            }
        }
        res.json({ success: true, data: order });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

// 3. CANCEL ORDER & REFUND
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (order.paymentMethod !== 'COD' && order.status !== 'Cancelled') {
            const user = await User.findById(order.customerId);
            if (user) {
                user.walletBalance += order.totalAmount;
                user.walletTransactions.unshift({ 
                    amount: order.totalAmount, type: 'CREDIT', reason: `Refund for Order #${order._id}`, date: new Date() 
                });
                await user.save();
            }
        }

        order.status = 'Cancelled';
        await order.save();
        res.json({ success: true, message: "Order cancelled and refund processed." });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

// 4. ADMIN: GET ALL ORDERS
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('customerId', 'name phone').sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

// 5. USER: GET MY ORDERS
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.params.userId }).sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};