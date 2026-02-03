const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryCharge = require('../models/DeliveryCharge');
const Payout = require('../models/Payout');
const Seller = require("../models/Seller");
exports.createOrder = async (req, res) => {
    try {
        const { items, customerId, shippingAddress, paymentMethod } = req.body;

        // 🌟 SAFETY CHECK: Ensure items exist
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: "No items in cart." });
        }

        if (!shippingAddress?.pincode) {
            return res.status(400).json({ success: false, message: "Pincode is required." });
        }

        const deliveryConfig = await DeliveryCharge.findOne({ pincode: shippingAddress.pincode });
        let baseDeliveryCharge = deliveryConfig ? deliveryConfig.charge : 50; 

        let totalProductAmount = 0;
        let finalDeliveryCharge = 0;
        let sellerWiseSplit = {};

        for (let item of items) {
            // 🌟 FIX: Safety check for sellerId
            if (!item.sellerId) {
                return res.status(400).json({ success: false, message: `Product ${item.name} is missing seller info.` });
            }

            const sellerId = item.sellerId.toString();
            
            if (!sellerWiseSplit[sellerId]) {
                const seller = await Seller.findById(sellerId);
                sellerWiseSplit[sellerId] = {
                    sellerId: sellerId,
                    shopName: seller?.shopName || "Unknown Seller",
                    items: [],
                    sellerSubtotal: 0,
                    deliveryChargeApplied: baseDeliveryCharge 
                };
            }

            if (item.isFreeDeliveryBySeller) {
                sellerWiseSplit[sellerId].deliveryChargeApplied = 0;
            }

            sellerWiseSplit[sellerId].items.push(item);
            sellerWiseSplit[sellerId].sellerSubtotal += (item.price * item.quantity);
            totalProductAmount += (item.price * item.quantity);
        }

        Object.values(sellerWiseSplit).forEach(split => {
            finalDeliveryCharge += split.deliveryChargeApplied;
        });

        let finalOrderAmount = totalProductAmount + finalDeliveryCharge;

        // 🌟 WALLET CHECK
        if (paymentMethod === 'WALLET') {
            const user = await User.findById(customerId);
            if (!user || user.walletBalance < finalOrderAmount) {
                return res.status(400).json({ success: false, message: "Insufficient Wallet Balance" });
            }
            // Note: Wallet deduction is usually handled in the Payment Session 
            // to avoid "Double Charging" if createOrder succeeds but payment fails.
        }

        const newOrder = new Order({
            customerId, 
            items, 
            sellerSplitData: Object.values(sellerWiseSplit), 
            totalAmount: finalOrderAmount, 
            deliveryChargeApplied: finalDeliveryCharge,
            paymentMethod, 
            shippingAddress, 
            status: 'Pending' // Always start as Pending until Payment is confirmed
        });

        await newOrder.save();
        res.status(201).json({ success: true, order: newOrder });

    } catch (err) { 
        console.error("Order Creation Error:", err); //  Log this to your terminal!
        res.status(500).json({ success: false, error: err.message }); 
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.orderId, { status }, { new: true });
        
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (status === 'Delivered') {
            let adminCommPercent = 10; 
            
            
            for (let split of order.sellerSplitData) {
                let commission = (split.sellerSubtotal * adminCommPercent) / 100;
                let finalSellerPay = split.sellerSubtotal - commission;

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
        res.status(500).json({ success: false, error: err.message }); 
    }
};

// 3. CANCEL ORDER & REFUND (Wallet-க்கு ரீஃபண்ட் செய்தல்)
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

// 4. ADMIN & USER APIs
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('customerId', 'name phone').sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.params.userId }).sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};


exports.getSellerOrders = async (req, res) => {
    try {
        const { sellerId } = req.params;
      
        const orders = await Order.find({ 
            "sellerSplitData.sellerId": sellerId,
            status: { $ne: 'Pending' }
        }).sort({ createdAt: -1 });

        res.json({ success: true, data: orders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};