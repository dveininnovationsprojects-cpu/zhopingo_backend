const Order = require('../models/Order');
const Seller = require('../models/Seller');
const axios = require('axios');

// ⚡ LIVE CONFIG
const DELHI_TOKEN = process.env.DELHIVERY_TOKEN; 
const DELHI_BASE_URL = "https://track.delhivery.com";

/* =====================================================
    ⚖️ HELPER: UNIVERSAL UNIT CONVERTER (Strict Metric Sync)
    Handles: kg, Liter, Gram, ML, k g, KG etc.
===================================================== */
const getWeightInKg = (value, unit = '') => {
    let rawInput = `${value}${unit}`.toLowerCase().replace(/\s+/g, '');
    const numberMatch = rawInput.match(/[\d.]+/);
    const unitMatch = rawInput.match(/[a-z]+/);

    if (!numberMatch) return 0.500; // Standard 500g guard

    const val = parseFloat(numberMatch[0]);
    const u = unitMatch ? unitMatch[0] : 'g';

    switch (true) {
        case /^(kg|kilogram|kilograms|k\.g)$/.test(u): return val;
        case /^(l|liter|liters|litre|litres)$/.test(u): return val;
        case /^(g|gram|grams|g\.m)$/.test(u): return val / 1000;
        case /^(ml|milliliter|milliliters)$/.test(u): return val / 1000;
        default: return val < 10 ? val : val / 1000;
    }
};

/* =====================================================
    🌟 1. LIVE RATE CALCULATION (Internal Use)
    Logic: Strictly API based - GST & Surcharge included.
===================================================== */
exports.getRealTimeRateInternal = async (pincode, weightKg, originPincode, paymentMode) => {
    try {
        const response = await axios.get(`${DELHI_BASE_URL}/api/kinko/v1/invoice/charges/.json`, {
            params: {
                ss: "R", 
                pt: paymentMode === "COD" ? "Cash" : "Pre-paid",
                o_pin: originPincode,
                d_pin: pincode,
                weight: Number(weightKg).toFixed(3) // 🌟 Professional Precision
            },
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        
        const apiRate = response.data?.[0]?.total_amount || response.data?.[0]?.gross_amount || 80;
        return Math.ceil(apiRate);
    } catch (err) {
        console.error("❌ Delhivery Rate API Error:", err.message);
        return 80; 
    }
};

/* =====================================================
    🌟 7. PUBLIC RATE CALCULATION (For Frontend Cart)
    Logic: Connects Frontend Request to Internal API Logic
===================================================== */
exports.calculateLiveDeliveryRate = async (req, res) => {
    try {
        const { pincode, items, paymentMode } = req.body;

        if (!pincode || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: "Missing pincode or items" });
        }

        // 🛡️ 1. Check if any item has Free Delivery
        const hasFreeDeliveryItem = items.some(item => item.isFreeDelivery === true);
        if (hasFreeDeliveryItem) {
            return res.json({ success: true, finalCharge: 0, type: "FREE" });
        }

        // ⚖️ 2. Total Weight Calculation
        let totalWeightKg = items.reduce((sum, item) => {
            const kg = getWeightInKg(item.weightValue || item.weight, item.unit || 'g');
            return sum + (kg * item.quantity);
        }, 0);

        // 🚚 3. Get Seller Origin (Usually first seller or default)
        const firstSellerId = items[0].sellerId;
        const sellerDoc = await Seller.findById(firstSellerId);
        const originPin = sellerDoc?.shopAddress?.pincode || "600001";

        // 📡 4. Call our Internal API function
        const liveRate = await exports.getRealTimeRateInternal(
            pincode, 
            totalWeightKg, 
            originPin, 
            paymentMode || "Pre-paid"
        );

        res.json({ 
            success: true, 
            finalCharge: liveRate, 
            type: "PAID",
            weight: totalWeightKg.toFixed(3)
        });

    } catch (err) {
        console.error("Cart Rate Error:", err.message);
        res.status(500).json({ success: false, finalCharge: 80, message: "Fallback applied" });
    }
};

/* =====================================================
    🌟 2. CREATE SHIPMENT (AWB Generation + DB Auto-Save)
    Logic: Automatically links AWB to Order & Seller Split.
===================================================== */
exports.processShipmentCreation = async (orderId, sellerId, pickupLocation) => {
    try {
        const order = await Order.findById(orderId);
        if (!order) return { success: false, message: "Order not found" };

        const sellerItems = order.items.filter(item => item.sellerId.toString() === sellerId.toString());
        // Calculate Total Package Weight for this Seller
        const totalWeight = sellerItems.reduce((sum, it) => sum + (getWeightInKg(it.weightValue || it.weight, it.unit) * it.quantity), 0);

        const shipmentData = {
            "shipments": [{
                "name": order.shippingAddress?.receiverName || "Customer",
                "add": `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || ""}`,
                "pin": order.shippingAddress?.pincode,
                "phone": order.shippingAddress?.phone || "9876543210", 
                "order": order._id.toString(),
                "payment_mode": order.paymentMethod === "COD" ? "Cash" : "Pre-paid",
                "amount": order.totalAmount,
                "weight": totalWeight.toFixed(3) // 🌟 Strict Kg format
            }],
            "pickup_location": { "name": pickupLocation } 
        };

        const response = await axios.post(`${DELHI_BASE_URL}/api/cmu/create.json`, 
            `format=json&data=${JSON.stringify(shipmentData)}`, 
            { headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (response.data && response.data.packages && response.data.packages[0]) {
            const awb = response.data.packages[0].waybill;

            // Update Seller Split Object
            order.sellerSplitData.forEach(split => {
                if (split.sellerId.toString() === sellerId.toString()) {
                    split.awbNumber = awb;
                    split.packageStatus = 'Packed';
                }
            });

            // Update individual Item status for UI handshake
            order.items.forEach(item => {
                if (item.sellerId.toString() === sellerId.toString()) {
                    item.itemAwbNumber = awb;
                    item.itemStatus = 'Packed';
                }
            });

            await order.save();
            return { success: true, awb, data: response.data };
        }
        return { success: false, message: "Delhivery AWB failed", error: response.data };
    } catch (err) {
        console.error("❌ Internal Shipment Sync Error:", err.message);
        return { success: false, error: err.message };
    }
};

/* =====================================================
    🌟 3. REAL-TIME TRACKING API (Timeline & Status)
===================================================== */
exports.trackOrder = async (req, res) => {
    try {
        const { awb } = req.params;
        const response = await axios.get(`${DELHI_BASE_URL}/api/v1/packages/json/`, {
            params: { waybill: awb },
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });

        const trackData = response.data?.ShipmentData?.[0]?.Shipment;
        if (!trackData) return res.status(404).json({ success: false, message: "AWB not found" });

        res.json({
            success: true,
            currentStatus: trackData.Status.Status,
            location: trackData.Status.ScannedLocation,
            history: trackData.Scans.map(s => ({
                time: s.ScanDetail.ScanDateTime,
                activity: s.ScanDetail.Instructions,
                place: s.ScanDetail.ScannedLocation
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/* =====================================================
    🌟 4. DOWNLOAD SHIPPING LABEL (Client's PDF Link)
===================================================== */
exports.downloadShippingLabel = async (req, res) => {
    try {
        const { awb } = req.params;
        const response = await axios.get(`${DELHI_BASE_URL}/api/p/packing_slip`, {
            params: { wbns: awb },
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        if (response.data?.packages?.[0]?.pdf_url) {
            return res.json({ success: true, url: response.data.packages[0].pdf_url });
        }
        res.status(404).json({ success: false, message: "Label not available yet." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/* =====================================================
    🌟 5. PINCODE SERVICEABILITY CHECK
===================================================== */
exports.checkServiceability = async (req, res) => {
    try {
        const { pincode } = req.query;
        const response = await axios.get(`${DELHI_BASE_URL}/api/v1/packages/pincode/serviceability.json`, {
            params: { filter_codes: pincode },
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        const data = response.data?.delivery_codes?.[0];
        res.json({
            success: true,
            isDeliverable: !!data?.postal_code?.pincode,
            canCOD: data?.postal_code?.cash === 'Y',
            estimatedDays: data?.postal_code?.replenishment_speed || "3-5 days"
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Delhivery API failure" });
    }
};

/* =====================================================
    📈 6. WEBHOOK (Auto-Sync Database Status)
===================================================== */
exports.handleDelhiveryWebhook = async (req, res) => {
    try {
        const { waybill, status } = req.body;
        const order = await Order.findOne({ "sellerSplitData.awbNumber": waybill });
        if (order) {
            order.sellerSplitData.forEach(split => {
                if (split.awbNumber === waybill) {
                    if (status === 'Delivered') split.packageStatus = 'Delivered';
                }
            });
            await order.save();
        }
        res.status(200).send("OK");
    } catch (err) { res.status(500).send("Error"); }
};