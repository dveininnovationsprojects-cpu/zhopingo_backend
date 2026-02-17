const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryCharge = require('../models/DeliveryCharge');
const axios = require('axios');
const mongoose = require('mongoose');

const DELHI_TOKEN = "9b44fee45422e3fe8073dee9cfe7d51f9fff7629";
const DELHI_URL_CREATE = "https://staging-express.delhivery.com/api/cmu/create.json";

// Helper for Delhivery
const createDelhiveryShipment = async (order, customerPhone) => {
    try {
        const shipmentData = {
            "shipments": [{
                "name": order.shippingAddress?.receiverName || "Customer",
                "add": `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.area || ""}`,
                "pin": order.shippingAddress?.pincode,
                "phone": customerPhone,
                "order": order._id.toString(),
                "payment_mode": "Pre-paid", 
                "amount": order.totalAmount,
                "weight": 0.5
            }],
            "pickup_location": { "name": "benjamin" } 
        };
        const finalData = `format=json&data=${JSON.stringify(shipmentData)}`;
        const response = await axios.post(DELHI_URL_CREATE, finalData, {
            headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data;
    } catch (error) { return null; }
};

// --- API Functions ---

exports.createOrder = async (req, res) => {
    try {
        const { items, customerId, shippingAddress, paymentMethod } = req.body;
        const newOrder = new Order({ customerId, items, shippingAddress, paymentMethod, status: 'Placed' });
        await newOrder.save();
        res.status(201).json({ success: true, order: newOrder });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

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
        const orders = await Order.find({ "items.sellerId": req.params.sellerId }).sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.orderId, { status: req.body.status }, { new: true });
        res.json({ success: true, data: order });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.bypassPaymentAndShip = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        const user = await User.findById(order.customerId);
        order.paymentStatus = "Paid";
        const delhiRes = await createDelhiveryShipment(order, user?.phone || "9876543210");
        if (delhiRes?.packages) order.awbNumber = delhiRes.packages[0].waybill;
        await order.save();
        res.json({ success: true, data: order });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.orderId, { status: 'Cancelled' }, { new: true });
        res.json({ success: true, message: "Order Cancelled" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};