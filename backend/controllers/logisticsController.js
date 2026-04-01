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
const Product = require('../models/Product');

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

const generateWarehouseName = (sellerDoc) => {
    // 1Cr Standard: Strictly using only Alphanumeric + ID slice
    const baseName = sellerDoc.shopName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10);
    const idSuffix = sellerDoc._id.toString().slice(-4);
    return (baseName + idSuffix).substring(0, 30);
};
exports.processShipmentCreation = async (orderId, sellerId) => {
    try {
        const order = await Order.findById(orderId);
        const sellerDoc = await Seller.findById(sellerId);

        if (!order || !sellerDoc) {
            return { success: false, message: "Order/Seller not found" };
        }

        const pickupLocationName = generateWarehouseName(sellerDoc);

        const sellerItems = order.items.filter(
            item => item.sellerId.toString() === sellerId.toString()
        );

        // ✅ Weight calculation (but AWB fail aagatha madhiri safe logic)
        let totalWeight = 0;

        for (const item of sellerItems) {
            try {
                const productDoc = await Product.findById(item.productId);
                if (productDoc) {
                    const weightKg = exports.getWeightInKg(
                        productDoc.weight || 500,
                        productDoc.unit || "g"
                    );
                    totalWeight += weightKg * item.quantity;
                } else {
                    totalWeight += 0.5 * item.quantity;
                }
            } catch (e) {
                totalWeight += 0.5 * item.quantity;
            }
        }

        if (totalWeight <= 0) totalWeight = 0.5;

        const shipmentData = {
            shipments: [{
                name: order.shippingAddress?.receiverName || "Customer",
                add: `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || ""}`,
                pin: order.shippingAddress?.pincode,
                phone: order.shippingAddress?.phone || "9876543210",
                order: order._id.toString(),
                payment_mode: order.paymentMethod === "COD" ? "Cash" : "Pre-paid",
                amount: order.totalAmount,
                weight: totalWeight.toFixed(3),

                // ✅ Add dimensions (important)
                length: 10,
                breadth: 10,
                height: 10
            }],
            pickup_location: {
                name: pickupLocationName
            }
        };

        console.log("📦 Shipment Payload:", shipmentData);

        const response = await axios.post(
            `${DELHI_BASE_URL}/api/cmu/create.json`,
            `format=json&data=${JSON.stringify(shipmentData)}`,
            {
                headers: {
                    Authorization: `Token ${DELHI_TOKEN}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );

        if (response.data && response.data.packages && response.data.packages[0]) {
            const awb = response.data.packages[0].waybill;

            // ✅ SAVE AWB like old code (important)
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

            return { success: true, awb };
        }

        return {
            success: false,
            message: response.data?.data?.message || "Delhivery API Reject"
        };

    } catch (err) {
        console.error("❌ Logistics Fail:", err.response?.data || err.message);
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
    📈 6. WEBHOOK (Auto-Sync Status from Delhivery)
    Purpose: Automatically moves status to SHIPPED/DELIVERED
===================================================== */
exports.handleDelhiveryWebhook = async (req, res) => {
    try {
        // Delhivery pushes status in various keys based on event
        const waybill = req.body.waybill || req.body.waybill_number || req.body.data?.waybill;
        const rawStatus = (req.body.status || req.body.data?.status || "").toLowerCase(); 

        console.log(`📡 WEBHOOK RECEIVED -> AWB: ${waybill} | Event: ${rawStatus}`);

        if (!waybill) return res.status(400).send("No Waybill Found");

        const order = await Order.findOne({ "sellerSplitData.awbNumber": waybill });
        
        if (order) {
            /* =====================================================
               🌟 INDUSTRY STATUS MAPPING (Golden Logic)
            ===================================================== */
            let newStatus = null;

            // Delhivery logic: Pickup aana udaney status 'In Transit' nu varum
            if (rawStatus.includes("transit") || rawStatus.includes("pickup") || rawStatus.includes("dispatched")) {
                newStatus = "Shipped"; // App-la 'Shipped' nu kaattuvaom
            } else if (rawStatus.includes("delivered")) {
                newStatus = "Delivered";
            } else if (rawStatus.includes("return") || rawStatus.includes("rto") || rawStatus.includes("undelivered")) {
                newStatus = "RTO";
            }

            if (newStatus) {
                // 1. Sync Seller Split Array (Admin View)
                order.sellerSplitData.forEach(split => {
                    if (split.awbNumber === waybill) {
                        split.packageStatus = newStatus;
                        if (newStatus === "Delivered") split.deliveredDate = new Date();
                    }
                });

                // 2. Sync Individual Items (Frontend Summary View)
                order.items.forEach(item => {
                    if (item.itemAwbNumber === waybill) {
                        item.itemStatus = newStatus;
                    }
                });

                await order.save();
                console.log(`✅ SYNC SUCCESS: Order ${order._id} is now ${newStatus}`);
            }
        }

        // Delhivery expects 200 OK within 2 seconds
        res.status(200).send("OK");

    } catch (err) { 
        console.error("❌ WEBHOOK CRASH:", err.message);
        // Responding with 200 even on error to stop Delhivery from retrying endlessly
        res.status(200).send("Error Logged"); 
    }
};
// logisticsController.js

exports.registerPickupLocation = async (sellerDoc) => {
    try {
        // Unique Name maintain pannuvom (No Pincode - strictly ShopName + ID last 4 digits)
        const uniqueName = generateWarehouseName(sellerDoc);

        const payload = {
            "name": uniqueName, 
            "email": sellerDoc.email || "support@zhopingo.in",
            "phone": sellerDoc.shopAddress?.phone || sellerDoc.phone || "9994718702",
            "contact_person": sellerDoc.shopAddress?.receiverName || sellerDoc.name, // Faculty Name logic
            "address": `${sellerDoc.shopAddress.flatNo}, ${sellerDoc.shopAddress.area}`,
            "city": sellerDoc.shopAddress.city || "Chennai",
            "country": "India",
            "pin": parseInt(sellerDoc.shopAddress.pincode), // Integer conversion for safety
            "return_address": `${sellerDoc.shopAddress.flatNo}, ${sellerDoc.shopAddress.area}`,
            "return_pin": parseInt(sellerDoc.shopAddress.pincode)
        };

        console.log(`📡 Attempting Smart Sync for: ${uniqueName}`);

        let response;
        try {
            /* 🚀 STRATEGY 1: TRY UPDATE (Edit) FIRST */
            // Delhivery edit endpoint strictly POST to '/edit/' accepts JSON
            response = await axios.post(`${DELHI_BASE_URL}/api/backend/clientwarehouse/edit/`, 
                payload, 
                { headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/json' } }
            );
            console.log("✅ Delhivery Update Success!");
        } catch (editErr) {
            // Oru vaelai andha seller innum register aagalana (404/Error code 2000)
            // Appo namma CREATE (Post) pannuvom.
            console.log("ℹ️ Entry missing or update failed, attempting Creation...");
            
            response = await axios.post(`${DELHI_BASE_URL}/api/backend/clientwarehouse/create/`, 
                payload, 
                { headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/json' } }
            );
            console.log("✅ Delhivery Creation Success!");
        }

        return { success: true, registeredName: uniqueName, data: response.data };

    } catch (err) {
        console.error("❌ Final Handshake Error:", err.response?.data || err.message);
        return { success: false, error: err.response?.data || err.message };
    }
};
exports.manualRegisterWarehouse = async (req, res) => {
    try {
        const { sellerId } = req.body;
        const sellerDoc = await Seller.findById(sellerId);
        if (!sellerDoc) return res.status(404).json({ success: false, message: "Seller not found" });

        // 🌟 uniqueName-ah strictly seller ID vachi fix pannuvom
        const uniqueName = (sellerDoc.shopName.replace(/[^a-zA-Z0-9]/g, "") + sellerDoc._id.toString().slice(-4)).substring(0, 30);

        const payload = {
            "name": uniqueName,
            "email": sellerDoc.email || "support@zhopingo.in",
            "phone": sellerDoc.shopAddress?.phone || sellerDoc.phone,
            "contact_person": sellerDoc.shopAddress?.receiverName || sellerDoc.name, // 👈 Faculty Name
            "address": `${sellerDoc.shopAddress.flatNo}, ${sellerDoc.shopAddress.area}`,
            "city": sellerDoc.shopAddress.city || "Chennai",
            "country": "India",
            "pin": sellerDoc.shopAddress.pincode,
            "return_address": `${sellerDoc.shopAddress.flatNo}, ${sellerDoc.shopAddress.area}`,
            "return_pin": sellerDoc.shopAddress.pincode
        };

        let response;
        try {
            // 🚀 STRATEGY: Try Update (PATCH) first
            console.log(`📡 Attempting UPDATE for: ${uniqueName}`);
            response = await axios.patch(`${DELHI_BASE_URL}/api/backend/clientwarehouse/edit/`, 
                payload, 
                { headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/json' } }
            );
        } catch (patchErr) {
            // 🚀 If entry doesn't exist, CREATE (POST) it
            console.log(`ℹ️ Entry not found, Attempting CREATE for: ${uniqueName}`);
            response = await axios.post(`${DELHI_BASE_URL}/api/backend/clientwarehouse/create/`, 
                payload, 
                { headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/json' } }
            );
        }

        res.json({ 
            success: true, 
            message: "Sync Successful!", 
            registeredName: uniqueName,
            facultyName: payload.contact_person,
            delhiveryMsg: response.data?.data?.message || "Operation Success"
        });

    } catch (err) {
        // Intha log 400 error-la enna field thappu nu katchithama kaattum
        console.error("❌ Registration Final Error:", err.response?.data || err.message);
        res.status(err.response?.status || 500).json({ 
            success: false, 
            error: err.response?.data || err.message 
        });
    }
};

// 📍 API TO TEST IF AWB IS GENERATING FOR A SELLER
exports.testAwbGeneration = async (req, res) => {
    try {
        const { sellerId } = req.body;
        const sellerDoc = await Seller.findById(sellerId);
        
        if (!sellerDoc) return res.status(404).json({ success: false, message: "Seller not found" });

        // Namma Dashboard sync logic (Strictly Navib5eb format)
        const pickupLocationName = (sellerDoc.shopName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10) + sellerDoc._id.toString().slice(-4)).substring(0, 30);

        console.log(`📡 Testing AWB for Warehouse: ${pickupLocationName}`);

        // Dummy Shipment Data (Delhivery accept panna strictly idhu pōdhum)
        const testData = {
            "shipments": [{
                "name": "Test Customer",
                "add": "No.1, Test Street, Chennai",
                "pin": "600040", // Valid destination pin
                "phone": "9876543210",
                "order": "TEST_" + Date.now(),
                "payment_mode": "Pre-paid",
                "amount": 100,
                "weight": 0.500
            }],
            "pickup_location": { "name": pickupLocationName }
        };

        const response = await axios.post(`${DELHI_BASE_URL}/api/cmu/create.json`, 
            `format=json&data=${JSON.stringify(testData)}`, 
            { headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (response.data && response.data.packages && response.data.packages[0]) {
            res.json({
                success: true,
                message: "AWB Generated Successfully!",
                warehouseUsed: pickupLocationName,
                awb: response.data.packages[0].waybill,
                fullResponse: response.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Delhivery Rejected Request",
                warehouseUsed: pickupLocationName,
                error: response.data
            });
        }
    } catch (err) {
        console.error("❌ Test AWB Error:", err.response?.data || err.message);
        res.status(500).json({ success: false, error: err.response?.data || err.message });
    }
};
exports.getShippingLabel = async (req, res) => {
    try {
        const { awb } = req.params;

        const response = await axios.get(
            `https://track.delhivery.com/api/p/packing_slip`,
            {
                params: {
                    wbns: awb,
                    pdf: "true",
                    pdf_size: "A4"
                },
                headers: {
                    Authorization: `Token ${process.env.DELHIVERY_TOKEN}`
                }
            }
        );

        const packages = response.data?.packages;

        // ✅ If label ready
        if (packages && packages.length > 0 && packages[0].pdf_download_link) {
            return res.json({
                success: true,
                labelUrl: packages[0].pdf_download_link
            });
        }

        // ⏳ If label not ready yet
        return res.json({
            success: false,
            message: "Label not ready yet. Try again in 30 seconds."
        });

    } catch (err) {
        console.error("Label Error:", err.response?.data || err.message);
        res.status(500).json({
            success: false,
            message: "Delhivery API error"
        });
    }
};
// 📄 B. GENERATE MANIFEST (Courier boy-kitta signature vaanga)
exports.getManifest = async (req, res) => {
    try {
        const { awb } = req.params;
        // Delhivery Manifest endpoint
        const response = await axios.get(`${DELHI_BASE_URL}/api/p/manifest/download?wbns=${awb}`, {
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        res.json({ success: true, manifestUrl: response.data?.url || "Pending" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 🔄 C. MANUAL STATUS REFRESH (Webhook late aana Seller check panna)
exports.syncOrderStatusManual = async (req, res) => {
    try {
        const { awb } = req.body;
        const response = await axios.get(`${DELHI_BASE_URL}/api/v1/packages/json/?waybill=${awb}`, {
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });

        const latestStatus = response.data?.ShipmentData?.[0]?.Shipment?.Status?.Status;
        if (!latestStatus) return res.status(404).json({ success: false, message: "AWB not found" });

        // Same Webhook logic-ah inga pōdurom to update DB
        // (Status 'In Transit' nu vandha DB-la 'Shipped' nu update aagum)
        
        res.json({ success: true, currentStatus: latestStatus, fullData: response.data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};
// 🚚 1. SCHEDULE PICKUP (Timezone-Safe Production Fix)
exports.schedulePickup = async (req, res) => {
    try {
        const { sellerId } = req.body;
        const sellerDoc = await Seller.findById(sellerId);
        
        if (!sellerDoc) return res.status(404).json({ success: false, message: "Seller not found" });

        const pickupLocationName = (sellerDoc.shopName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10) + sellerDoc._id.toString().slice(-4)).substring(0, 30);

        /* =====================================================
           🌟 THE IST SYNC: Force Today's Date in Indian Time
        ===================================================== */
        const now = new Date();
        // IST logic: UTC + 5:30
        const ISTOffset = 5.5 * 60 * 60 * 1000;
        const ISTTime = new Date(now.getTime() + ISTOffset);
        const todayIST = ISTTime.toISOString().split('T')[0];

        // 🌟 THE ULTIMATE SYNC URL
        const PICKUP_URL = `https://track.delhivery.com/fm/request/new/`;

        const payload = {
            "pickup_time": "14:00:00", 
            "pickup_date": todayIST, // 👈 Correct IST Date (April 1st)
            "pickup_location": pickupLocationName,
            "expected_package_count": 1 
        };

        console.log(`📡 Requesting Pickup for: ${pickupLocationName} on ${todayIST}`);

        const response = await axios.post(PICKUP_URL, 
            payload,
            { 
                headers: { 
                    'Authorization': `Token ${DELHI_TOKEN}`, 
                    'Content-Type': 'application/json' 
                } 
            }
        );

        if (response.data) {
            console.log("✅ PICKUP REQUEST SUCCESS!");
            return res.json({ 
                success: true, 
                message: "Pickup Scheduled! Date: " + todayIST, 
                data: response.data 
            });
        }

    } catch (err) {
        console.error("❌ Pickup API Error Status:", err.response?.status);
        console.error("❌ Error Details:", err.response?.data);

        res.status(500).json({ 
            success: false, 
            error: "Logistics Sync Failed",
            details: err.response?.data || err.message
        });
    }
};