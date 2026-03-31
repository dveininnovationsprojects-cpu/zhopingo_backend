// const Order = require('../models/Order');
// const Seller = require('../models/Seller');
// const axios = require('axios');

// // ⚡ LIVE CONFIG
// const DELHI_TOKEN = process.env.DELHIVERY_TOKEN; 
// const DELHI_BASE_URL = "https://track.delhivery.com";

// /* =====================================================
//     ⚖️ HELPER: UNIVERSAL UNIT CONVERTER (Strict Metric Sync)
// ===================================================== */
// const getWeightInKg = (value, unit = '') => {
//     let rawInput = `${value}${unit}`.toLowerCase().replace(/\s+/g, '');
//     const numberMatch = rawInput.match(/[\d.]+/);
//     const unitMatch = rawInput.match(/[a-z]+/);

//     if (!numberMatch) return 0.500; // Standard 500g guard

//     const val = parseFloat(numberMatch[0]);
//     const u = unitMatch ? unitMatch[0] : 'g';

//     switch (true) {
//         case /^(kg|kilogram|kilograms|k\.g)$/.test(u): return val;
//         case /^(l|liter|liters|litre|litres)$/.test(u): return val;
//         case /^(g|gram|grams|g\.m)$/.test(u): return val / 1000;
//         case /^(ml|milliliter|milliliters)$/.test(u): return val / 1000;
//         default: return val < 10 ? val : val / 1000;
//     }
// };

// exports.getWeightInKg = getWeightInKg;

// /* =====================================================
//     🌟 1. LIVE RATE CALCULATION (Internal Use)
//     Strict Mode: 100% Real API.
// ===================================================== */
// exports.getRealTimeRateInternal = async (pincode, weightKg, originPincode, paymentMode) => {
//     try {
//         const weightInGrams = Math.ceil(weightKg * 1000);

//         const response = await axios.get(`${DELHI_BASE_URL}/api/kinko/v1/invoice/charges/.json`, {
//             params: {
//                 md: "S", 
//                 ss: "Delivered", // 🌟 THE FINAL FIX: Changed to 'Delivered' as per Delhivery's strict validation
//                 pt: paymentMode === "COD" ? "Cash" : "Pre-paid",
//                 o_pin: originPincode,
//                 d_pin: pincode,
//                 weight: weightInGrams,
//                 cgm: weightInGrams     
//             },
//             headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
//         });
        
//         console.log(`📦 Delhivery Check -> Weight sent: ${weightInGrams}g, Charge: ₹${response.data?.[0]?.total_amount}`);

//         const apiRate = response.data?.[0]?.total_amount || response.data?.[0]?.gross_amount;
        
//         if (apiRate === undefined || apiRate === null) {
//             throw new Error("Amount missing in Delhivery response");
//         }

//         return Math.ceil(apiRate);
//     } catch (err) {
//         console.error("❌ Delhivery Rate API Error:", err.response?.data || err.message);
//         throw new Error(err.response?.data?.message || err.response?.data?.error || "Failed to fetch from Delhivery");
//     }
// };

// // /* =====================================================
// //     🌟 7. PUBLIC RATE CALCULATION (For Frontend Cart)
// // ===================================================== */
// // exports.calculateLiveDeliveryRate = async (req, res) => {
// //     try {
// //         const { pincode, items, paymentMode } = req.body;

// //         if (!pincode || !items || items.length === 0) {
// //             return res.status(400).json({ success: false, message: "Missing pincode or items" });
// //         }

// //         const hasFreeDeliveryItem = items.some(item => item.isFreeDelivery === true);
// //         if (hasFreeDeliveryItem) {
// //             return res.json({ success: true, finalCharge: 0, type: "FREE" });
// //         }

// //         let totalWeightKg = items.reduce((sum, item) => {
// //             const kg = exports.getWeightInKg(item.weightValue || item.weight, item.unit || 'g');
// //             return sum + (kg * item.quantity);
// //         }, 0);

// //         const firstSellerId = items[0].sellerId;
// //         const sellerDoc = await Seller.findById(firstSellerId);
// //         const originPin = sellerDoc?.shopAddress?.pincode || "600001";

// //         const liveRate = await exports.getRealTimeRateInternal(
// //             pincode, 
// //             totalWeightKg, 
// //             originPin, 
// //             paymentMode || "Pre-paid"
// //         );

// //         res.json({ 
// //             success: true, 
// //             finalCharge: liveRate, 
// //             type: "PAID",
// //             weight: totalWeightKg.toFixed(3)
// //         });

// //     } catch (err) {
// //         console.error("Cart Rate Error:", err.message);
// //         res.status(500).json({ success: false, finalCharge: 80, message: "Fallback applied" });
// //     }
// // };

// /* =====================================================
// /* =====================================================
//     🌟 7. PUBLIC RATE CALCULATION (For Frontend Cart)
// ===================================================== */
// exports.calculateLiveDeliveryRate = async (req, res) => {
//     try {
//         const { pincode, items, paymentMode } = req.body;

//         if (!pincode || !items || items.length === 0) {
//             return res.status(400).json({ success: false, message: "Missing pincode or items" });
//         }

//         const hasFreeDeliveryItem = items.some(item => item.isFreeDelivery === true);
//         if (hasFreeDeliveryItem) {
//             return res.json({ success: true, finalCharge: 0, type: "FREE" });
//         }

//         let totalWeightKg = items.reduce((sum, item) => {
//             const kg = exports.getWeightInKg(item.weightValue || item.weight, item.unit || 'g');
//             return sum + (kg * item.quantity);
//         }, 0);

//         const firstSellerId = items[0].sellerId;
//         const sellerDoc = await Seller.findById(firstSellerId);
//         const originPin = sellerDoc?.shopAddress?.pincode || "600001";

//         // 📡 Step 1: Delhivery kitta irundhu real rate vaanguroam (e.g., ₹39)
//         const realApiRate = await exports.getRealTimeRateInternal(
//             pincode, 
//             totalWeightKg, 
//             originPin, 
//             paymentMode || "Pre-paid"
//         );

//         /* =====================================================
//             💰 THE MASTER PROFIT GUARD: FORCE MINIMUM ₹80
//         ===================================================== */
//         // Industrial Standard: Frontend-ku anupura amount strictly customer pay panna pora amount.
//         // API ₹39 nu sonnalum, namma ₹80 thaan return pannuvom.
//         let finalChargeToCustomer = realApiRate < 80 ? 80 : realApiRate;

//         console.log(`🚀 PROFIT SYNC: Delhivery: ₹${realApiRate} | Customer Charged: ₹${finalChargeToCustomer}`);

//         res.json({ 
//             success: true, 
//             finalCharge: finalChargeToCustomer, // 🌟 Ippo 80 thaan pōgum
//             type: "PAID",
//             weight: totalWeightKg.toFixed(3),
//             actualLogisticsCost: realApiRate // Internal tracking-kaga
//         });

//     } catch (err) {
//         console.error("Cart Rate Error:", err.message);
//         // Fallback-layum strictly 80 dhaan irukanum
//         res.status(500).json({ success: false, finalCharge: 80, message: "Fallback applied" });
//     }
// };

// /* =====================================================
//     🌟 2. CREATE SHIPMENT (AWB Generation + DB Auto-Save)
// ===================================================== */
// exports.processShipmentCreation = async (orderId, sellerId, pickupLocation) => {
//     try {
//         const order = await Order.findById(orderId);
//         if (!order) return { success: false, message: "Order not found" };

//         const sellerItems = order.items.filter(item => item.sellerId.toString() === sellerId.toString());
//         const totalWeight = sellerItems.reduce((sum, it) => sum + (exports.getWeightInKg(it.weightValue || it.weight, it.unit) * it.quantity), 0);

//         const shipmentData = {
//             "shipments": [{
//                 "name": order.shippingAddress?.receiverName || "Customer",
//                 "add": `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || ""}`,
//                 "pin": order.shippingAddress?.pincode,
//                 "phone": order.shippingAddress?.phone || "9876543210", 
//                 "order": order._id.toString(),
//                 "payment_mode": order.paymentMethod === "COD" ? "Cash" : "Pre-paid",
//                 "amount": order.totalAmount,
//                 "weight": totalWeight.toFixed(3) 
//             }],
//             "pickup_location": { "name": pickupLocation } 
//         };

//         const response = await axios.post(`${DELHI_BASE_URL}/api/cmu/create.json`, 
//             `format=json&data=${JSON.stringify(shipmentData)}`, 
//             { headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
//         );

//         if (response.data && response.data.packages && response.data.packages[0]) {
//             const awb = response.data.packages[0].waybill;

//             order.sellerSplitData.forEach(split => {
//                 if (split.sellerId.toString() === sellerId.toString()) {
//                     split.awbNumber = awb;
//                     split.packageStatus = 'Packed';
//                 }
//             });

//             order.items.forEach(item => {
//                 if (item.sellerId.toString() === sellerId.toString()) {
//                     item.itemAwbNumber = awb;
//                     item.itemStatus = 'Packed';
//                 }
//             });

//             await order.save();
//             return { success: true, awb, data: response.data };
//         }
//         return { success: false, message: "Delhivery AWB failed", error: response.data };
//     } catch (err) {
//         console.error("❌ Internal Shipment Sync Error:", err.message);
//         return { success: false, error: err.message };
//     }
// };

// /* =====================================================
//     🌟 3. REAL-TIME TRACKING API (Timeline & Status)
// ===================================================== */
// exports.trackOrder = async (req, res) => {
//     try {
//         const { awb } = req.params;
//         const response = await axios.get(`${DELHI_BASE_URL}/api/v1/packages/json/`, {
//             params: { waybill: awb },
//             headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
//         });

//         const trackData = response.data?.ShipmentData?.[0]?.Shipment;
//         if (!trackData) return res.status(404).json({ success: false, message: "AWB not found" });

//         res.json({
//             success: true,
//             currentStatus: trackData.Status.Status,
//             location: trackData.Status.ScannedLocation,
//             history: trackData.Scans.map(s => ({
//                 time: s.ScanDetail.ScanDateTime,
//                 activity: s.ScanDetail.Instructions,
//                 place: s.ScanDetail.ScannedLocation
//             }))
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

// /* =====================================================
//     🌟 4. DOWNLOAD SHIPPING LABEL (Client's PDF Link)
// ===================================================== */
// exports.downloadShippingLabel = async (req, res) => {
//     try {
//         const { awb } = req.params;
//         const response = await axios.get(`${DELHI_BASE_URL}/api/p/packing_slip`, {
//             params: { wbns: awb },
//             headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
//         });
//         if (response.data?.packages?.[0]?.pdf_url) {
//             return res.json({ success: true, url: response.data.packages[0].pdf_url });
//         }
//         res.status(404).json({ success: false, message: "Label not available yet." });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

// /* =====================================================
//     🌟 5. PINCODE SERVICEABILITY CHECK
// ===================================================== */
// exports.checkServiceability = async (req, res) => {
//     try {
//         const { pincode } = req.query;
//         const response = await axios.get(`${DELHI_BASE_URL}/api/v1/packages/pincode/serviceability.json`, {
//             params: { filter_codes: pincode },
//             headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
//         });
//         const data = response.data?.delivery_codes?.[0];
//         res.json({
//             success: true,
//             isDeliverable: !!data?.postal_code?.pincode,
//             canCOD: data?.postal_code?.cash === 'Y',
//             estimatedDays: data?.postal_code?.replenishment_speed || "3-5 days"
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, error: "Delhivery API failure" });
//     }
// };

// /* =====================================================
//     📈 6. WEBHOOK (Auto-Sync Database Status)
// ===================================================== */
// exports.handleDelhiveryWebhook = async (req, res) => {
//     try {
//         const { waybill, status } = req.body;
//         const order = await Order.findOne({ "sellerSplitData.awbNumber": waybill });
//         if (order) {
//             order.sellerSplitData.forEach(split => {
//                 if (split.awbNumber === waybill) {
//                     if (status === 'Delivered') split.packageStatus = 'Delivered';
//                 }
//             });
//             await order.save();
//         }
//         res.status(200).send("OK");
//     } catch (err) { res.status(500).send("Error"); }
// };

// /* =====================================================
//     🏠 DELHI-WAREHOUSE: Auto-Register Pickup Location
// ===================================================== */
// exports.registerPickupLocation = async (sellerDoc) => {
//     try {
//         const payload = {
//             "name": sellerDoc.shopName, // 👈 Unique Warehouse Name
//             "email": sellerDoc.email || "support@zhopingo.in",
//             "phone": sellerDoc.phone,
//             "address": `${sellerDoc.shopAddress.flatNo}, ${sellerDoc.shopAddress.area}`,
//             "city": sellerDoc.shopAddress.city || "Chennai",
//             "country": "India",
//             "pin": sellerDoc.shopAddress.pincode,
//             "return_address": `${sellerDoc.shopAddress.flatNo}, ${sellerDoc.shopAddress.area}`,
//             "return_pin": sellerDoc.shopAddress.pincode
//         };

//         const response = await axios.post(`${DELHI_BASE_URL}/api/backend/clientwarehouse/create/.json`, 
//             payload, 
//             { headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/json' } }
//         );

//         console.log(`✅ Delhivery Location Registered: ${sellerDoc.shopName}`);
//         return { success: true, data: response.data };
//     } catch (err) {
//         console.error("❌ Delhivery Location Registration Error:", err.response?.data || err.message);
//         return { success: false, error: err.message };
//     }
// };



const Order = require('../models/Order');
const Seller = require('../models/Seller');
const axios = require('axios');

// ⚡ LIVE CONFIG
const DELHI_TOKEN = process.env.DELHIVERY_TOKEN; 
const DELHI_BASE_URL = "https://track.delhivery.com";

/* =====================================================
    ⚖️ HELPER: UNIVERSAL UNIT CONVERTER
===================================================== */
const getWeightInKg = (value, unit = '') => {
    let rawInput = `${value}${unit}`.toLowerCase().replace(/\s+/g, '');
    const numberMatch = rawInput.match(/[\d.]+/);
    const unitMatch = rawInput.match(/[a-z]+/);
    if (!numberMatch) return 0.500;
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
exports.getWeightInKg = getWeightInKg;

/* =====================================================
    🌟 1. LIVE RATE CALCULATION (Internal Use)
===================================================== */
exports.getRealTimeRateInternal = async (pincode, weightKg, originPincode, paymentMode) => {
    try {
        const weightInGrams = Math.ceil(weightKg * 1000);
        const response = await axios.get(`${DELHI_BASE_URL}/api/kinko/v1/invoice/charges/.json`, {
            params: {
                md: "S", ss: "Delivered",
                pt: paymentMode === "COD" ? "Cash" : "Pre-paid",
                o_pin: originPincode, d_pin: pincode,
                weight: weightInGrams, cgm: weightInGrams     
            },
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        const apiRate = response.data?.[0]?.total_amount || response.data?.[0]?.gross_amount;
        if (apiRate === undefined || apiRate === null) throw new Error("Amount missing");
        return Math.ceil(apiRate);
    } catch (err) {
        throw new Error("Delhivery Rate API Error");
    }
};

/* =====================================================
    🌟 7. PUBLIC RATE CALCULATION (For Frontend Cart)
===================================================== */
exports.calculateLiveDeliveryRate = async (req, res) => {
    try {
        const { pincode, items, paymentMode } = req.body;
        if (!pincode || !items || items.length === 0) return res.status(400).json({ success: false, message: "Missing data" });

        const hasFreeDeliveryItem = items.some(item => item.isFreeDelivery === true);
        if (hasFreeDeliveryItem) return res.json({ success: true, finalCharge: 0, type: "FREE" });

        let totalWeightKg = items.reduce((sum, item) => {
            const kg = exports.getWeightInKg(item.weightValue || item.weight, item.unit || 'g');
            return sum + (kg * item.quantity);
        }, 0);

        const firstSellerId = items[0].sellerId;
        const sellerDoc = await Seller.findById(firstSellerId);
        const originPin = sellerDoc?.shopAddress?.pincode || "600001";

        const realApiRate = await exports.getRealTimeRateInternal(pincode, totalWeightKg, originPin, paymentMode || "Pre-paid");
        let finalChargeToCustomer = realApiRate < 80 ? 80 : realApiRate;

        res.json({ 
            success: true, 
            finalCharge: finalChargeToCustomer, 
            type: "PAID",
            weight: totalWeightKg.toFixed(3),
            actualLogisticsCost: realApiRate
        });
    } catch (err) {
        res.status(500).json({ success: false, finalCharge: 80, message: "Fallback applied" });
    }
};

/* =====================================================
    🌟 2. CREATE SHIPMENT (AWB Generation)
===================================================== */
exports.processShipmentCreation = async (orderId, sellerId, pickupLocation) => {
    try {
        const order = await Order.findById(orderId);
        if (!order) return { success: false, message: "Order not found" };

        const sellerItems = order.items.filter(item => item.sellerId.toString() === sellerId.toString());
        const totalWeight = sellerItems.reduce((sum, it) => sum + (exports.getWeightInKg(it.weightValue || it.weight, it.unit) * it.quantity), 0);

        const shipmentData = {
            "shipments": [{
                "name": order.shippingAddress?.receiverName || "Customer",
                "add": `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || ""}`,
                "pin": order.shippingAddress?.pincode,
                "phone": order.shippingAddress?.phone || "9876543210", 
                "order": order._id.toString(),
                "payment_mode": order.paymentMethod === "COD" ? "Cash" : "Pre-paid",
                "amount": order.totalAmount,
                "weight": totalWeight.toFixed(3) 
            }],
            "pickup_location": { "name": pickupLocation } 
        };

        const response = await axios.post(`${DELHI_BASE_URL}/api/backend/clientwarehouse/create/`,
            `format=json&data=${JSON.stringify(shipmentData)}`, 
            { headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (response.data && response.data.packages && response.data.packages[0]) {
            const awb = response.data.packages[0].waybill;
            order.sellerSplitData.forEach(split => {
                if (split.sellerId.toString() === sellerId.toString()) {
                    split.awbNumber = awb;
                    split.packageStatus = 'Packed';
                }
            });
            order.items.forEach(item => {
                if (item.sellerId.toString() === sellerId.toString()) {
                    item.itemAwbNumber = awb;
                    item.itemStatus = 'Packed';
                }
            });
            await order.save();
            return { success: true, awb, data: response.data };
        }
        return { success: false, message: "Delhivery AWB failed" };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

/* =====================================================
    🌟 3. REAL-TIME TRACKING API
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
                time: s.ScanDetail.ScanDateTime, activity: s.ScanDetail.Instructions, place: s.ScanDetail.ScannedLocation
            }))
        });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

/* =====================================================
    🌟 4. DOWNLOAD SHIPPING LABEL
===================================================== */
exports.downloadShippingLabel = async (req, res) => {
    try {
        const { awb } = req.params;
        const response = await axios.get(`${DELHI_BASE_URL}/api/p/packing_slip`, {
            params: { wbns: awb },
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        if (response.data?.packages?.[0]?.pdf_url) return res.json({ success: true, url: response.data.packages[0].pdf_url });
        res.status(404).json({ success: false, message: "Label not available." });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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
    } catch (err) { res.status(500).json({ success: false, error: "Delhivery API failure" }); }
};

/* =====================================================
    📈 6. WEBHOOK (Auto-Sync Status)
===================================================== */
exports.handleDelhiveryWebhook = async (req, res) => {
    try {
        // 🌟 THE SYNC: Multiple keys handle panroam for safety
        const waybill = req.body.waybill || req.body.waybill_number || req.body.data?.waybill;
        const status = req.body.status || req.body.data?.status;

        const order = await Order.findOne({ "sellerSplitData.awbNumber": waybill });
        if (order) {
            order.sellerSplitData.forEach(split => {
                if (split.awbNumber === waybill && status === 'Delivered') split.packageStatus = 'Delivered';
            });
            await order.save();
        }
        res.status(200).send("OK");
    } catch (err) { res.status(500).send("Error"); }
};

// logisticsController.js kulla...

// logisticsController.js

exports.registerPickupLocation = async (sellerDoc) => {
    try {
        // 🌟 RULE 1: Strictly uniqueName-ah Seller ID vachi fix pannuvom (No Pincode)
        // Appo thaan pincode maarunaalum adhae entry-la update aagum
        const uniqueName = (sellerDoc.shopName.replace(/[^a-zA-Z0-9]/g, "") + sellerDoc._id.toString().slice(-4)).substring(0, 30);

        const payload = {
            "name": uniqueName, 
            "email": sellerDoc.email || "support@zhopingo.in",
            "phone": sellerDoc.shopAddress?.phone || sellerDoc.phone,
            "contact_person": sellerDoc.shopAddress?.receiverName || sellerDoc.name, // 👈 Faculty Name fix
            "address": `${sellerDoc.shopAddress.flatNo}, ${sellerDoc.shopAddress.area}`,
            "city": sellerDoc.shopAddress.city || "Chennai",
            "country": "India",
            "pin": sellerDoc.shopAddress.pincode,
            "return_address": `${sellerDoc.shopAddress.flatNo}, ${sellerDoc.shopAddress.area}`,
            "return_pin": sellerDoc.shopAddress.pincode
        };

        let response;
        try {
            // 🚀 Step A: Adhae name-la entry iruntha strictly UPDATE (PATCH) pannu
            console.log(`📡 Attempting to Update existing warehouse: ${uniqueName}`);
            response = await axios.patch(`${DELHI_BASE_URL}/api/backend/clientwarehouse/edit/`, 
                payload, 
                { headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/json' } }
            );
            console.log("✅ Delhivery Update Success!");
        } catch (patchErr) {
            // 🚀 Step B: Oru vaelai andha name-la entry illana mattum CREATE (POST) pannu
            console.log(`ℹ️ Entry not found, creating new warehouse: ${uniqueName}`);
            response = await axios.post(`${DELHI_BASE_URL}/api/backend/clientwarehouse/create/`, 
                payload, 
                { headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/json' } }
            );
            console.log("✅ Delhivery Creation Success!");
        }

        return { success: true, registeredName: uniqueName };

    } catch (err) {
        console.error("❌ Delhivery Sync Error:", err.response?.data || err.message);
        return { success: false, error: err.message };
    }
};
exports.manualRegisterWarehouse = async (req, res) => {
    try {
        const { sellerId } = req.body;
        if (!sellerId) return res.status(400).json({ success: false, message: "Seller ID missing" });

        const sellerDoc = await Seller.findById(sellerId);
        if (!sellerDoc) return res.status(404).json({ success: false, message: "Seller not found" });

        // 🌟 Unique Name logic (Maintain this to avoid 'Already exists' conflict)
        const uniqueName = (sellerDoc.shopName.replace(/[^a-zA-Z0-9]/g, "") + sellerDoc._id.toString().slice(-4)).substring(0, 30);

        const payload = {
            "name": uniqueName,
            "email": sellerDoc.email || "support@zhopingo.in",
            "phone": sellerDoc.phone || "9994718702",
            "address": `${sellerDoc.shopAddress.flatNo}, ${sellerDoc.shopAddress.area}`,
            "city": sellerDoc.shopAddress.city || "Chennai",
            "country": "India",
            "pin": sellerDoc.shopAddress.pincode,
            "return_address": `${sellerDoc.shopAddress.flatNo}, ${sellerDoc.shopAddress.area}`,
            "return_pin": sellerDoc.shopAddress.pincode
        };

        // 🔥 URL FIX: Removed .json to prevent 404 HTML Error
        const response = await axios.post(`${DELHI_BASE_URL}/api/backend/clientwarehouse/create/`, 
            payload, 
            { headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/json' } }
        );

        console.log("🔥 DELHI-RESPONSE:", JSON.stringify(response.data, null, 2));

        res.json({ 
            success: true, 
            message: "Warehouse Registered in Delhivery!", 
            delhiveryData: response.data,
            registeredName: uniqueName 
        });

    } catch (err) {
        // Ippo HTML error varaadhu, katchithama JSON error response varum
        console.error("❌ Registration Error:", err.response?.data || err.message);
        res.status(500).json({ success: false, error: err.response?.data || err.message });
    }
};