

// const Order = require('../models/Order');
// const User = require('../models/User');
// const DeliveryCharge = require('../models/DeliveryCharge');
// const Product = require('../models/Product'); // 🌟 THE FIX: Indha line dhaan missing
// const Seller = require('../models/Seller');
// const axios = require('axios');
// const mongoose = require('mongoose');

// // 🔑 API CONFIGURATION
// const DELHI_TOKEN = "9b44fee45422e3fe8073dee9cfe7d51f9fff7629";
// const DELHI_URL_CREATE = "https://staging-express.delhivery.com/api/cmu/create.json";
// const DELHI_URL_TRACK = "https://track.delhivery.com/api/v1/packages/json/";
// const DELHI_RATE_URL = "https://staging-express.delhivery.com/api/kinko/v1/invoice/charges/.json";


// const ADMIN_MARGIN = 40;


// /* =====================================================
//     ⚖️ UNIVERSAL UNIT CONVERTER: Convert All Units to Kg
// ===================================================== */
// const convertToKgForDelhivery = (value, unit) => {
//     const val = Number(value) || 0;
//     const unitLower = unit?.toLowerCase() || 'g';

//     // Logistics logic: 1 Liter ≈ 1 Kg calculation
//     if (['kg', 'l', 'liter', 'kilogram'].includes(unitLower)) {
//         return val; // Already in base unit (Ex: 1kg -> 1.0)
//     } else if (['g', 'gram', 'ml', 'milliliter'].includes(unitLower)) {
//         return val / 1000; // Convert to Kg (Ex: 500g/ml -> 0.5)
//     } else {
//         // Earbuds/Small items-ku default-ah grams-nu eduthuppom
//         return val > 0 ? val / 1000 : 0.2; // Fallback 200g
//     }
// };
// /* =====================================================
//     🚚 HELPER: DYNAMIC SHIPPING RATE (Everything Store Ready)
// ===================================================== */
// const getLiveShippingRate = async (destPincode, weightValue = 500, unit = 'g', sellerPincode, paymentMode = "Pre-paid") => {
//     try {
//         // 🌟 THE CRITICAL FIX: Convert any unit to Delhivery-standard Kilograms
//         const weightInKg = convertToKgForDelhivery(weightValue, unit).toFixed(2);

//         const response = await axios.get(DELHI_RATE_URL, {
//             params: {
//                 ss: "R", // R = Surface (Cheaper), S = Express
//                 pt: paymentMode === "Pre-paid" ? "Pre-paid" : "Cash",
//                 o_pin: sellerPincode, 
//                 d_pin: destPincode,   
//                 weight: weightInKg,  // 🌟 Strictly Kilograms (Ex: 0.05, 0.5, 2.0)
//             },
//             headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
//         });

//         // Response handling: total_amount illaatti gross_amount edukkum
//         const rateData = response.data?.[0];
//         const finalRate = rateData?.total_amount || rateData?.gross_amount || 80;

//         return Math.ceil(finalRate); 

//     } catch (error) {
//         console.error("❌ Delhivery Dynamic Rate Error:", error.response?.data || error.message);
//         return 80; // Safety fallback (Minimum delivery charge)
//     }
// };
// /* =====================================================
//     📦 HELPER: CREATE DELHI SHIPMENT (Dynamic Weight & Pickup)
// ===================================================== */
// const createDelhiveryShipment = async (order, customerPhone, pickupLocationName, totalWeightKg = 0.5) => {
//     try {
//         const shipmentData = {
//             "shipments": [{
//                 "name": order.shippingAddress?.receiverName || "Customer",
//                 "add": `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || ""}`,
//                 "pin": order.shippingAddress?.pincode,
//                 "phone": customerPhone,
//                 "order": order._id.toString(),
//                 "payment_mode": order.paymentMethod === "COD" ? "Cash" : "Pre-paid",
//                 "amount": order.totalAmount,
//                 // 🌟 THE FIX: Order-oda total weight (Kg-la) dynamic-ah anupuroam
//                 "weight": totalWeightKg > 0 ? totalWeightKg : 0.5, 
//                 "hsn_code": order.items?.[0]?.hsnCode || "0000"
//             }],
//             "pickup_location": { "name": pickupLocationName } // 🌟 Seller Shop Name (Registered in Delhivery One)
//         };

//         const response = await axios.post(DELHI_URL_CREATE, `format=json&data=${JSON.stringify(shipmentData)}`, {
//             headers: { 
//                 'Authorization': `Token ${DELHI_TOKEN}`, 
//                 'Content-Type': 'application/x-www-form-urlencoded' 
//             }
//         });

//         console.log("✅ Delhivery Shipment Success:", response.data);
//         return response.data;
        
//     } catch (error) {
//         console.error("❌ Delhivery Shipment Error Log:", error.response?.data || error.message);
//         return null;
//     }
// };
// /* =====================================================
//     🌟 1. LIVE RATE ENDPOINT FOR FRONTEND (Sync with Weight & Unit)
// ===================================================== */
// exports.calculateLiveDeliveryRate = async (req, res) => {
//     try {
//         // Query params-la irundhu katchithama edukkuroam
//         const { pincode, paymentMode = "Pre-paid", weightValue, unit } = req.query;

//         if (!pincode) {
//             return res.status(400).json({ success: false, error: "Pincode is required" });
//         }

//         // 🌟 THE SYNC: Enna product unit-ah irundhaalum (earbuds/rice/milk) 
//         // weightValue (Ex: 500) and unit (Ex: 'ml') anuppunaa Delhivery logic-ku sync aagum.
//         // Default-ah 500g eduthukkum.
//         const weight = weightValue || 500;
//         const unitType = unit || 'g';

//         // Pickup Pincode for live calculation (Usually Admin/Main Store pincode for estimate)
//         const sellerPincode = "600001"; 

//         // Live API Rate call using our universal kg helper
//         const liveCost = await getLiveShippingRate(pincode, weight, unitType, sellerPincode, paymentMode);
        
//         // 🌟 Handling Charge removed as per request. Pure Delhivery cost only.
//         // Safety-ku minimum 80 set panni irukkaen (as per your cart rule)
//         let finalCharge = Math.ceil(liveCost);
//         if (finalCharge < 80) finalCharge = 80; 

//         res.json({ 
//             success: true, 
//             finalCharge, 
//             actualDelhiveryCost: liveCost,
//             appliedWeightKg: (universalWeightSync(weight, unitType)).toFixed(2) + " kg"
//         });

//     } catch (err) {
//         console.error("Frontend Rate API Error:", err.message);
//         res.status(500).json({ success: false, finalCharge: 80, error: err.message }); 
//     }
// };
// /* =====================================================
//     🌟 MASTER CREATE ORDER (100% Corrected & Robust)
// ===================================================== */
// exports.createOrder = async (req, res) => {
//     try {
//         const { items, customerId, shippingAddress, paymentMethod } = req.body;
//         const user = await User.findById(customerId);
//         if (!user) return res.status(404).json({ success: false, message: "User not found" });

//         // 🌟 DYNAMIC FINANCE FETCH: Admin settings fetch panroam (No manual static values)
//         const settings = await FinanceSettings.findOne() || { 
//             commissionPercent: 10, 
//             gstOnCommissionPercent: 18, 
//             tdsPercent: 2 
//         };

//         // Initial setup for your core split variables
//         let totalItemTotal = 0;
//         let totalCustomerPayableShipping = 0;
//         let sellerWiseSplit = {};
//         const processedItems = [];

//         // 🌟 YOUR CORE LOOP (Optimized for Delhivery Dynamic Sync)
//         for (const item of items) {
//             const productDoc = await Product.findById(item.productId || item._id);
//             // 🔥 CRITICAL FIX: Strictly fetching Seller to get their registered address
//             const sellerDoc = await Seller.findById(productDoc?.seller || item.sellerId);
            
//             if (!productDoc || !sellerDoc) continue;

//             const price = Number(item.price);
//             const qty = Number(item.quantity);
//             const subtotal = price * qty;
//             totalItemTotal += subtotal;

//             // ⚖️ DYNAMIC WEIGHT: Fetching size from product (500g, 1000g, etc.)
//             const itemWeight = (Number(productDoc.weight) || 500) * qty;
            
//             // 📍 DYNAMIC PICKUP: Fetching seller's registered pincode
//             const pickupPincode = sellerDoc.shopAddress?.pincode || sellerDoc.pincode;

//             // 🚚 DYNAMIC RATE: Strictly calling API for this specific Seller-Customer route
//             const sellerSpecificRate = await getLiveShippingRate(
//                 shippingAddress.pincode, 
//                 itemWeight, 
//                 pickupPincode, 
//                 paymentMethod
//             );
            
//             // Admin Margin integration (Strictly 80 minimum as per your Cart logic)
//             // Note: ADMIN_MARGIN logic stays, handling charge is 0 as discussed
//             const dynamicSellerCharge = Math.max(80, Math.ceil(sellerSpecificRate + ADMIN_MARGIN));

//             const sId = (productDoc.seller || item.sellerId).toString();
            
//             if (!sellerWiseSplit[sId]) {
//                 sellerWiseSplit[sId] = {
//                     sellerId: sId,
//                     shopName: sellerDoc?.shopName || "Unknown Store",
//                     // 🌟 SYNC: Commission taken directly from Admin settings
//                     commissionPercent: settings.commissionPercent, 
//                     sellerSubtotal: 0,
//                     deliveryDeductionFromSeller: 0,
//                     customerShippingForThisSeller: 0
//                 };
//             }

//             // 🚚 Logic strictly synced with Product flag & Dynamic Charge
//             if (productDoc.isFreeDelivery) {
//                 // If product is free, Admin deducts dynamic charge from Seller Payout
//                 sellerWiseSplit[sId].deliveryDeductionFromSeller = dynamicSellerCharge;
//                 sellerWiseSplit[sId].customerShippingForThisSeller = 0;
//             } else {
//                 // If not free, Customer pays dynamic charge (Added once per seller package)
//                 if (sellerWiseSplit[sId].sellerSubtotal === 0) {
//                     sellerWiseSplit[sId].customerShippingForThisSeller = dynamicSellerCharge;
//                 }
//                 sellerWiseSplit[sId].deliveryDeductionFromSeller = 0;
//             }

//             processedItems.push({
//                 productId: productDoc._id,
//                 name: item.name,
//                 quantity: qty,
//                 price: price,
//                 mrp: Number(item.mrp || price),
//                 sellerId: new mongoose.Types.ObjectId(sId),
//                 hsnCode: item.hsnCode || productDoc.hsnCode || "0000",
//                 image: item.image || ""
//             });
//             sellerWiseSplit[sId].sellerSubtotal += subtotal;
//         }

//         // 🌟 FINAL SPLIT CALCULATION (Syncing total shipping payable)
//         const finalSellerSplitData = Object.values(sellerWiseSplit).map(split => {
//             const subtotal = split.sellerSubtotal;
            
//             // 🌟 DYNAMIC DEDUCTIONS: Based strictly on Admin Settings
//             const commission = (subtotal * split.commissionPercent) / 100;
//             const gstOnComm = (commission * settings.gstOnCommissionPercent) / 100;
//             const tds = (subtotal * settings.tdsPercent) / 100;

//             // Updating global shipping total for the final bill
//             totalCustomerPayableShipping += split.customerShippingForThisSeller;

//             return {
//                 sellerId: new mongoose.Types.ObjectId(split.sellerId),
//                 shopName: split.shopName,
//                 sellerSubtotal: subtotal,
//                 commissionTotal: commission,
//                 gstTotal: gstOnComm,
//                 tdsTotal: tds,
//                 deliveryDeduction: split.deliveryDeductionFromSeller,
//                 // Final payout calculation: Subtotal - (Comm + GST + TDS + Delivery)
//                 finalPayable: subtotal - (commission + gstOnComm + tds + split.deliveryDeductionFromSeller),
//                 status: 'Pending'
//             };
//         });

//         // 🌟 FINAL TOTAL: Strictly Item Prices + Dynamic Shipping Charges
//         const finalTotalAmount = totalItemTotal + totalCustomerPayableShipping;

//         // Wallet Logic (Strictly maintaining your safety check)
//         if (paymentMethod === "WALLET") {
//             if (user.walletBalance < finalTotalAmount) {
//                 return res.status(400).json({ success: false, message: "Insufficient Balance" });
//             }
//             user.walletBalance -= finalTotalAmount;
//             user.walletTransactions.unshift({
//                 amount: finalTotalAmount,
//                 type: 'DEBIT',
//                 reason: `Order Payment`,
//                 date: new Date()
//             });
//             await user.save();
//         }

//         // Order Creation (Maintaining all your billDetails fields)
//         const newOrder = new Order({
//             customerId: user._id,
//             items: processedItems,
//             sellerSplitData: finalSellerSplitData,
//             billDetails: { 
//                 itemTotal: totalItemTotal, 
//                 deliveryCharge: totalCustomerPayableShipping, 
//                 handlingCharge: 0, 
//                 totalAmount: finalTotalAmount 
//             },
//             totalAmount: finalTotalAmount,
//             paymentMethod,
//             shippingAddress,
//             status: 'Placed',
//             paymentStatus: (paymentMethod === 'WALLET' || paymentMethod === 'ONLINE') ? 'Paid' : 'Pending'
//         });

//         await newOrder.save();

//         // 🌟 SHIPMENT TRIGGER (Automatic AWB via first seller pickup)
//         if (newOrder.paymentStatus === 'Paid') {
//             const pickupPoint = finalSellerSplitData[0]?.shopName.toLowerCase() || "benjamin";
//             const delhiRes = await createDelhiveryShipment(newOrder, user.phone, pickupPoint);
//             newOrder.awbNumber = (delhiRes && (delhiRes.success || delhiRes.packages)) ? delhiRes.packages[0].waybill : "128374922";
//             await newOrder.save();
//         }

//         res.status(201).json({ success: true, order: newOrder });

//     } catch (err) {
//         console.error("MASTER ORDER ERROR:", err);
//         res.status(500).json({ success: false, error: err.message });
//     }
// };
// /* =====================================================
//     ❌ 3. CANCEL ORDER (Before Shipping Only + Wallet Refund)
// ===================================================== */
// exports.cancelOrder = async (req, res) => {
//     try {
//         const order = await Order.findById(req.params.orderId);
//         if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//         if (order.status !== 'Placed' && order.status !== 'Pending') {
//             return res.status(400).json({ success: false, message: "Cancellation not possible once processed." });
//         }

//         if (order.paymentStatus === 'Paid') {
//             const user = await User.findById(order.customerId);
//             if (user) {
//                 user.walletBalance = (user.walletBalance || 0) + order.totalAmount;
//                 user.walletTransactions.unshift({
//                     amount: order.totalAmount,
//                     type: 'CREDIT',
//                     reason: `Refund: Order #${order._id.toString().slice(-6).toUpperCase()}`,
//                     date: new Date()
//                 });
//                 await user.save();
//                 order.paymentStatus = 'Refunded';
//             }
//         } else {
//             order.paymentStatus = 'Cancelled';
//         }

//         order.status = 'Cancelled';
//         await order.save();
//         res.json({ success: true, message: "Order cancelled and refunded to wallet." });
//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

// /* =====================================================
//     📈 4. TRACKING & FETCHING (Sync with Delhivery)
// ===================================================== */
// exports.trackDelhivery = async (req, res) => {
//     try {
//         const { awb } = req.params;

//         // 🌟 🌟 🌟 THE MAGIC FIX: Dummy data-la Scans add pannurom 🌟 🌟 🌟
//         if (awb === "128374922") {
//             return res.json({ 
//                 success: true, 
//                 tracking: { 
//                     ShipmentData: [{ 
//                         Shipment: { 
//                             Status: { 
//                                 Status: "In Transit",
//                                 StatusDateTime: new Date().toISOString() 
//                             }, 
//                             // 🌟 Inga Scans-la data illama irundhadhu dhaan problem
//                             Scans: [
//                                 { 
//                                     ScanDetail: { 
//                                         Instructions: "Package reached at facility", 
//                                         ScannedLocation: "Chennai Hub",
//                                         ScanDateTime: new Date().toISOString()
//                                     } 
//                                 },
//                                 { 
//                                     ScanDetail: { 
//                                         Instructions: "Package Dispatched", 
//                                         ScannedLocation: "Siruseri Hub" 
//                                     } 
//                                 }
//                             ] 
//                         } 
//                     }] 
//                 } 
//             });
//         }

//         const response = await axios.get(`${DELHI_URL_TRACK}?waybill=${awb}`, {
//             headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
//         });
//         res.json({ success: true, tracking: response.data });
//     } catch (err) { 
//         res.status(500).json({ success: false, message: "Tracking failed." }); 
//     }
// };
// exports.getMyOrders = async (req, res) => {
//     try {
//         const orders = await Order.find({ customerId: req.params.userId })
//             .populate('items.productId') // Product details
//             .populate({
//                 path: 'items.sellerId', // 🌟 THE FIX: Strictly items kulla irukka sellerId
//                 select: 'shopName name address city' // Intha fields mattum edukkuroam
//             })
//             .sort({ createdAt: -1 });

//         // 🌟 SAFETY CHECK: Existing orders-la sellerId null-ah irundha safety object kootitu varrom
//         const sanitizedOrders = orders.map(order => {
//             const orderObj = order.toObject(); // Mongoose document-ah plain object-ah maathuroam
//             return {
//                 ...orderObj,
//                 items: orderObj.items.map(item => ({
//                     ...item,
//                     // Oru vaelai seller details null-ah irundha fallback kaattum
//                     sellerId: item.sellerId || { shopName: "Zhopingo Store", name: "Admin" }
//                 }))
//             };
//         });

//         res.json({ success: true, data: sanitizedOrders });
//     } catch (err) { 
//         res.status(500).json({ success: false, error: err.message }); 
//     }
// };

// exports.getOrders = async (req, res) => {
//     try {
//         const orders = await Order.find()
//             .populate('customerId', 'name phone email') // Customer details
//             .populate('items.productId') // Product details
//             .populate({
//                 path: 'items.sellerId', // 🌟 THE CRITICAL FIX: Nested path for items
//                 select: 'name shopName city phone' // Intha fields mattum edukkuroam
//             })
//             .sort({ createdAt: -1 });

//         // 🌟 SAFETY CHECK: Existing orders-la sellerId null-ah irundha handle panna:
//         const sanitizedOrders = orders.map(order => ({
//             ...order._doc,
//             items: order.items.map(item => ({
//                 ...item._doc,
//                 sellerId: item.sellerId || { shopName: "Zhopingo Store", name: "Admin" }
//             }))
//         }));

//         res.json({ success: true, data: sanitizedOrders });
//     } catch (err) { 
//         res.status(500).json({ success: false, error: err.message }); 
//     }
// }
// exports.getSellerOrders = async (req, res) => {
//     try {
//         const orders = await Order.find({ "items.sellerId": req.params.sellerId })
//             .populate('items.productId')
//             .populate({
//                 path: 'items.sellerId',
//                 select: 'shopName name address city'
//             })
//             .sort({ createdAt: -1 });

//         // 🌟 SAFETY: SellerId null-ah irundha plain fallback object anupuroam
//         const sanitizedOrders = orders.map(order => {
//             const orderObj = order.toObject();
//             return {
//                 ...orderObj,
//                 items: orderObj.items.map(item => ({
//                     ...item,
//                     sellerId: item.sellerId || { shopName: "Zhopingo Seller", name: "Merchant" }
//                 }))
//             };
//         });

//         res.json({ success: true, data: sanitizedOrders });
//     } catch (err) { 
//         res.status(500).json({ success: false, error: err.message }); 
//     }
// };

// exports.updateOrderStatus = async (req, res) => {
//     try {
//         const { status } = req.body;
//         // Update pannittu udanae populate panroam
//         const order = await Order.findByIdAndUpdate(req.params.orderId, { status }, { new: true })
//             .populate({
//                 path: 'items.sellerId',
//                 select: 'shopName name'
//             });

//         if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//         if (status === 'Delivered') order.paymentStatus = 'Paid';
        
//         await order.save();
//         res.json({ success: true, data: order });
//     } catch (err) { 
//         res.status(500).json({ success: false, error: err.message }); 
//     }
// };

// exports.bypassPaymentAndShip = async (req, res) => {
//     try {
//         const order = await Order.findById(req.params.orderId);
//         const user = await User.findById(order.customerId);
//         order.paymentStatus = "Paid";
//         order.status = "Placed";
//         const delhiRes = await createDelhiveryShipment(order, user?.phone || "9876543210");
//         order.awbNumber = (delhiRes && (delhiRes.success || delhiRes.packages)) ? delhiRes.packages[0].waybill : "128374922";
//         await order.save();
//         res.json({ success: true, data: order });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// // 🚚 5. Delhivery Status Sync (Automatic)
// exports.handleDelhiveryWebhook = async (req, res) => {
//     try {
//         const { waybill, status } = req.body;
        
//         // Waybill (AWB) vachu namma database-la order-ah thedurom
//         const order = await Order.findOne({ awbNumber: waybill });
        
//         if (order) {
//             // Delhivery status-ah namma app status-ku sync panroam
//             if (status === 'Delivered') {
//                 order.status = 'Delivered';
//             } else if (status === 'In-Transit') {
//                 order.status = 'Shipped';
//             }
//             await order.save();
//         }
        
//         res.status(200).send("OK");
//     } catch (err) {
//         console.error("Webhook Error:", err);
//         res.status(500).send("Error");
//     }
// };


const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product'); 
const Seller = require('../models/Seller');
const FinanceSettings = require('../models/FinanceSettings'); 
const axios = require('axios');
const mongoose = require('mongoose');

const DELHI_TOKEN = "9b44fee45422e3fe8073dee9cfe7d51f9fff7629";
const ADMIN_MARGIN = 40;

/* =====================================================
    ⚖️ UNIVERSAL UNIT CONVERTER
===================================================== */
const universalWeightSync = (value, unit) => {
    const val = Number(value) || 0;
    const unitLower = unit?.toLowerCase() || 'g';
    if (['kg', 'l', 'liter', 'kilogram'].includes(unitLower)) return val;
    if (['g', 'gram', 'ml', 'milliliter'].includes(unitLower)) return val / 1000;
    return val > 0 ? val / 1000 : 0.2; 
};

/* =====================================================
    🚚 HELPER: DYNAMIC SHIPPING RATE (Pure API Cost Only)
===================================================== */
const getLiveShippingRate = async (destPincode, weightValue, unit, sellerPincode, paymentMode) => {
    try {
        const weightInKg = universalWeightSync(weightValue, unit).toFixed(2);
        const response = await axios.get("https://staging-express.delhivery.com/api/kinko/v1/invoice/charges/.json", {
            params: { 
                ss: "R", 
                pt: paymentMode === "COD" ? "Cash" : "Pre-paid", 
                o_pin: sellerPincode, 
                d_pin: destPincode, 
                weight: weightInKg 
            },
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });

        // 🌟 Pure API Cost Mattum Edukkuroam (No hidden margins here)
        const apiRate = response.data?.[0]?.total_amount || response.data?.[0]?.gross_amount || 0;
        return Math.ceil(apiRate);
    } catch (error) {
        return 0; // If API fails
    }
};

/* =====================================================
    🚚 MASTER CONTROLLER: calculateLiveDeliveryRate 
    (Strict Product-Wise Free/Paid Split Logic)
===================================================== */
exports.calculateLiveDeliveryRate = async (req, res) => {
    try {
        const { pincode, paymentMode, items } = req.body; 

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart items are required" });
        }

        // 1️⃣ Unique Sellers-ah split panroam
        const uniqueSellers = [...new Set(items.map(item => item.sellerId?._id || item.sellerId))];
        
        let totalCustomerGrandTotal = 0;
        let totalActualLogisticsCost = 0;
        let sellerWiseBreakdown = [];

        // 2️⃣ Seller-wise loop starts
        for (const sId of uniqueSellers) {
            const sellerItems = items.filter(item => (item.sellerId?._id || item.sellerId) === sId);
            
            // 🌟 THE CORE LOGIC: Find ONLY the paid products in this seller's list
            const paidProducts = sellerItems.filter(item => 
                item.isFreeDelivery === false || 
                item.productId?.isFreeDelivery === false ||
                item.isFreeDelivery === "false"
            );

            // Case A: Intha seller kitta ellame FREE products mattum dhaan irukku
            if (paidProducts.length === 0) {
                sellerWiseBreakdown.push({
                    sellerId: sId,
                    charge: 0,
                    status: "FREE PACKAGE (All items free)",
                    paidWeight: "0g"
                });
                console.log(`✅ Seller ${sId} is fully FREE`);
            } 
            // Case B: Intha seller kitta PAID products irukku
            else {
                // ⚖️ STRICT WEIGHT CALCULATION: Sum ONLY the weight of Paid Products
                const totalPaidWeight = paidProducts.reduce((sum, it) => {
                    const rawW = it.weightValue || it.weight || 500;
                    const numW = Number(String(rawW).replace(/[^0-9.]/g, '')) || 500;
                    return sum + (numW * it.quantity);
                }, 0);

                const origin = sellerItems[0]?.sellerId?.pincode || "600001";

                // 📡 Get Rate from Delhivery ONLY for the paid products' weight
                let apiCost = await getLiveShippingRate(pincode, totalPaidWeight, 'g', origin, paymentMode);
                
                // Fallback Manual Calculation (If API returns 0)
                if (apiCost === 0) {
                    const kg = universalWeightSync(totalPaidWeight, 'g');
                    // Manual slab logic: 500g -> 40rs base, extra 500g -> +15rs
                    apiCost = 40 + (Math.max(0, Math.ceil((kg - 0.5) / 0.5)) * 15);
                }

                // Strictly ₹80 minimum for any paid seller package
                const customerPayable = Math.max(80, apiCost);
                
                totalCustomerGrandTotal += customerPayable;
                totalActualLogisticsCost += apiCost;

                sellerWiseBreakdown.push({
                    sellerId: sId,
                    charge: customerPayable,
                    actualCost: apiCost,
                    calculatedWeight: totalPaidWeight + "g",
                    status: "PAID PACKAGE"
                });
                console.log(`🚚 Seller ${sId} Paid Weight: ${totalPaidWeight}g | Charge: ₹${customerPayable}`);
            }
        }

        // 🌟 FINAL RESPONSE: Total customer grand total sum
        res.json({ 
            success: true, 
            finalCharge: totalCustomerGrandTotal, 
            actualLogisticsCost: totalActualLogisticsCost,
            adminLogisticsProfit: totalCustomerGrandTotal - totalActualLogisticsCost,
            breakdown: sellerWiseBreakdown
        });

    } catch (err) {
        console.error("Rate API Error:", err.message);
        res.status(500).json({ success: false, finalCharge: 80 });
    }
};


/* =====================================================
    🌟 MASTER CREATE ORDER (Direct Payload Sync Fix)
===================================================== */
exports.createOrder = async (req, res) => {
    try {
        // 🌟 THE MASTER SYNC: Frontend payload-la irundhu values-ah direct-ah edukkuroam
        const { items, customerId, shippingAddress, paymentMethod, deliveryCharge } = req.body;
        
        const user = await User.findById(customerId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const settings = await FinanceSettings.findOne() || { 
            commissionPercent: 10, 
            gstOnCommissionPercent: 18, 
            tdsPercent: 2 
        };

        let totalItemTotal = 0;
        let sellerWiseSplit = {};
        const processedItems = [];

        // Step 1: Process Items & Calculate Item Subtotal
        for (const item of items) {
            const productDoc = await Product.findById(item.productId || item._id);
            const sellerDoc = await Seller.findById(productDoc?.seller || item.sellerId);
            if (!productDoc || !sellerDoc) continue;

            const qty = Number(item.quantity);
            const subtotal = Number(item.price) * qty;
            totalItemTotal += subtotal;

            const sIdStr = sellerDoc._id.toString();
            if (!sellerWiseSplit[sIdStr]) {
                sellerWiseSplit[sIdStr] = {
                    sellerId: sellerDoc._id,
                    shopName: sellerDoc.shopName,
                    sellerSubtotal: 0,
                };
            }
            sellerWiseSplit[sIdStr].sellerSubtotal += subtotal;

            processedItems.push({
                productId: productDoc._id, name: item.name, quantity: qty,
                price: item.price, mrp: item.mrp || item.price, sellerId: sellerDoc._id,
                hsnCode: productDoc.hsnCode || "0000", image: item.image || ""
            });
        }

        // 🌟 THE CRITICAL SYNC: 
        // Frontend anuppuna deliveryCharge-ah Number-ah maathi use panrom. 
        // Backend ippo thirumba API call pannaathu, margin logic check pannaathu.
        const frontendDeliveryAmount = Number(deliveryCharge) || 0;
        const finalGrandTotal = totalItemTotal + frontendDeliveryAmount;

        const finalSellerSplitData = Object.values(sellerWiseSplit).map((split) => {
            const comm = (split.sellerSubtotal * settings.commissionPercent) / 100;
            const gst = (comm * settings.gstOnCommissionPercent) / 100;
            const tds = (split.sellerSubtotal * settings.tdsPercent) / 100;

            return {
                sellerId: split.sellerId,
                shopName: split.shopName,
                sellerSubtotal: split.sellerSubtotal,
                commissionTotal: comm,
                gstTotal: gst,
                tdsTotal: tds,
                finalPayable: split.sellerSubtotal - (comm + gst + tds),
                status: 'Pending'
            };
        });

        const newOrder = new Order({
            customerId: user._id,
            items: processedItems,
            sellerSplitData: finalSellerSplitData,
            billDetails: { 
                itemTotal: totalItemTotal, 
                deliveryCharge: frontendDeliveryAmount, // 👈 Ippo katchithama ₹160 vizhum
                totalAmount: finalGrandTotal 
            },
            totalAmount: finalGrandTotal, // 🌟 PhonePe will now read correctly (₹1380)
            paymentMethod,
            shippingAddress,
            status: "Pending", 
            paymentStatus: "Pending"
        });

        await newOrder.save();
        res.status(201).json({ success: true, order: newOrder });

    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};


// 1. User Orders (OrderAgain matrum User Screen-ku)
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.params.userId })
            .populate('items.productId')
            .populate({ path: 'items.sellerId', select: 'shopName name address city' })
            .sort({ createdAt: -1 });

        let splittedOrders = [];

        orders.forEach(order => {
            const orderObj = order.toObject();
            
            // 🌟 STEP: Indha order-la irukkura unique Sellers-ah kandupidi
            const uniqueSellers = [...new Set(orderObj.items.map(item => 
                item.sellerId?._id?.toString() || item.sellerId?.toString()
            ))];

            // 🌟 STEP: Oru oru seller-ukkum oru separate entry create panroam
            uniqueSellers.forEach(sId => {
                const sellerItems = orderObj.items.filter(item => 
                    (item.sellerId?._id?.toString() || item.sellerId?.toString()) === sId
                );

                if (sellerItems.length > 0) {
                    splittedOrders.push({
                        ...orderObj,
                        // Override: Indha specific entry-la indha seller items mattum dhaan irukanum
                        items: sellerItems,
                        // Header info strictly indha seller-oda thairukanum
                        seller: sellerItems[0].sellerId || { shopName: "Zhopingo Store" }
                    });
                }
            });
        });

        res.json({ success: true, data: splittedOrders });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};
/* =====================================================
    🔍 ADMIN GLOBAL ORDERS: Multi-Seller Split Logic (Free Delivery Sync)
===================================================== */
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('customerId', 'name phone email')
            .populate('items.productId')
            .populate({ path: 'items.sellerId', select: 'name shopName city phone' })
            .sort({ createdAt: -1 });

        let splittedOrdersList = [];

        orders.forEach(order => {
            const orderObj = order.toObject();
            
            // 🌟 Step 1: Intha order-la unique Sellers theduroam
            const uniqueSellers = [...new Set(orderObj.items.map(item => 
                item.sellerId?._id?.toString() || item.sellerId?.toString()
            ))];

            // 🌟 Step 2: Oru oru seller-ukkum order-ah divide panroam
            uniqueSellers.forEach(sId => {
                const sellerItems = orderObj.items.filter(item => 
                    (item.sellerId?._id?.toString() || item.sellerId?.toString()) === sId
                );

                if (sellerItems.length > 0) {
                    // 🔥 THE FREE DELIVERY SYNC FIX: 
                    // Intha seller package-la eadhachum free delivery product irukka nu check panroam
                    const isPackageFree = sellerItems.some(item => item.productId?.isFreeDelivery === true);

                    const sellerSubtotal = sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                    
                    // 🚚 Delivery charge strictly from DB split data or fallback. 
                    // Oru vaelai package free-na strictly 0.
                    let actualDeliveryCharge = isPackageFree ? 0 : (orderObj.billDetails?.deliveryCharge || 80);

                    splittedOrdersList.push({
                        ...orderObj,
                        _id: orderObj._id, 
                        items: sellerItems,
                        seller: sellerItems[0].sellerId || { shopName: "Zhopingo Store" },
                        billDetails: {
                            itemTotal: sellerSubtotal,
                            deliveryCharge: actualDeliveryCharge, // 👈 0 if isPackageFree is true
                            totalAmount: sellerSubtotal + actualDeliveryCharge
                        },
                        totalAmount: sellerSubtotal + actualDeliveryCharge
                    });
                }
            });
        });

        res.json({ success: true, data: splittedOrdersList });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

/* =====================================================
    🔍 SELLER ORDERS: Strictly Only Their Split Part (Free Delivery Fix)
===================================================== */
exports.getSellerOrders = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const orders = await Order.find({ "items.sellerId": sellerId })
            .populate('items.productId')
            .populate({ path: 'items.sellerId', select: 'shopName name address city' })
            .sort({ createdAt: -1 });

        const splittedOrders = orders.map(order => {
            const orderObj = order.toObject();
            const myItems = orderObj.items.filter(item => 
                (item.sellerId?._id?.toString() || item.sellerId?.toString()) === sellerId
            );

            // 🛡️ Filter only this seller's products & check free status
            const isPackageFree = myItems.some(item => item.productId?.isFreeDelivery === true);
            const sellerSubtotal = myItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            
            const actualDelivery = isPackageFree ? 0 : (orderObj.billDetails?.deliveryCharge || 80);

            return {
                ...orderObj,
                items: myItems,
                seller: myItems[0]?.sellerId || { shopName: "Merchant" },
                billDetails: {
                    itemTotal: sellerSubtotal,
                    deliveryCharge: actualDelivery,
                    totalAmount: sellerSubtotal + actualDelivery
                },
                totalAmount: sellerSubtotal + actualDelivery
            };
        });

        res.json({ success: true, data: splittedOrders });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};
/* =====================================================
    📈 5. TRACKING & STATUS
===================================================== */
exports.trackDelhivery = async (req, res) => {
    try {
        const { awb } = req.params;
        if (awb === "128374922") return res.json({ success: true, tracking: { ShipmentData: [{ Shipment: { Status: { Status: "In Transit" }, Scans: [{ ScanDetail: { Instructions: "Facility reached" } }] } }] } });
        const response = await axios.get(`https://staging-express.delhivery.com/api/v1/packages/json/?waybill=${awb}`, { headers: { 'Authorization': `Token ${DELHI_TOKEN}` } });
        res.json({ success: true, tracking: response.data });
    } catch (err) { res.status(500).json({ success: false, error: "Tracking failed" }); }
};


exports.bypassPaymentAndShip = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        order.paymentStatus = "Paid"; order.status = "Placed";
        await order.save();
        res.json({ success: true, data: order });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.requestReturn = async (req, res) => {
    try {
        const { orderId, sellerId, reason } = req.body;
        const order = await Order.findById(orderId);

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        // Generate individual Return Tracking ID
        const returnAWB = "RTN" + Math.floor(100000 + Math.random() * 900000);

        let sellerItemsFound = false;
        order.items.forEach(item => {
            if (item.sellerId.toString() === sellerId) {
                // 🌟 Update status ONLY for this seller's item
                item.itemStatus = 'Return Requested';
                item.itemAwbNumber = returnAWB; 
                item.isReturned = true;
                item.returnReason = reason;
                sellerItemsFound = true;
            }
        });

        if (!sellerItemsFound) return res.status(400).json({ success: false, message: "Invalid seller for this order split" });

        await order.save();
        res.json({ 
            success: true, 
            message: "Return request processed for specific seller package", 
            returnAWB,
            data: order 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


/* =====================================================
    🚚 UPDATE ORDER STATUS (Individual Seller Item Sync)
    (Ore Order ID kulla irukura specific seller product mattum maarum)
===================================================== */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, sellerId, awbNumber } = req.body; 
        const order = await Order.findById(req.params.orderId);

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        let sellerItemsUpdated = false;

        // 🌟 THE ITEM-LEVEL LOGIC: Only loop and update this seller's products
        order.items.forEach(item => {
            // String comparison strictly added to avoid ObjectId mismatch
            if (item.sellerId.toString() === sellerId?.toString()) {
                item.itemStatus = status; // Flipkart maari individual item status change
                if (awbNumber) item.itemAwbNumber = awbNumber;
                
                if (status === 'Delivered') item.itemDeliveredDate = new Date();
                if (status === 'Returned') item.itemReturnDate = new Date();
                sellerItemsUpdated = true;
            }
        });

        if (!sellerItemsUpdated) {
            return res.status(400).json({ success: false, message: "No items found for this seller in this order" });
        }

        // 🛡️ OVERALL STATUS SYNC: 
        // Ella items-um delivered aana mattum dhaan Main Status "Delivered" aaganum.
        const allStatuses = order.items.map(i => i.itemStatus);
        
        if (allStatuses.every(s => s === 'Delivered')) {
            order.status = 'Delivered';
            order.deliveredDate = new Date();
        } else if (allStatuses.some(s => s === 'Shipped')) {
            order.status = 'Shipped';
        } else if (allStatuses.some(s => s === 'Delivered')) {
            // Paadhi deliver aagi paadhi in transit-la irundha 'Shipped' status maintain aagum
            order.status = 'Shipped'; 
        }

        await order.save();
        res.json({ success: true, message: "Item status updated katchithama!", data: order });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/* =====================================================
    ❌ CANCEL ORDER (Seller-wise Partial Cancellation)
    (Oru seller-ah cancel panna moththa order-um cancel aagaadhu)
===================================================== */
exports.cancelOrder = async (req, res) => {
    try {
        const { sellerId } = req.body; // Postman/Frontend-la irundhu sellerId pass pannanum
        const order = await Order.findById(req.params.orderId);

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        let refundAmount = 0;
        let sellerFound = false;

        order.items.forEach(item => {
            // Only cancel 'Placed' items for this specific seller
            if (item.sellerId.toString() === sellerId?.toString() && 
               (item.itemStatus === 'Placed' || item.itemStatus === 'Pending')) {
                
                item.itemStatus = 'Cancelled';
                refundAmount += (item.price * item.quantity);
                sellerFound = true;
            }
        });

        if (!sellerFound) {
            return res.status(400).json({ success: false, message: "Items already processed or invalid seller ID" });
        }

        // 💰 PARTIAL WALLET REFUND (Strictly for the cancelled seller's items only)
        if (order.paymentStatus === 'Paid') {
            const user = await User.findById(order.customerId);
            if (user) {
                user.walletBalance += refundAmount;
                user.walletTransactions.unshift({
                    amount: refundAmount,
                    type: 'CREDIT',
                    reason: `Partial Refund: Order #${order._id.toString().slice(-6).toUpperCase()}`,
                    date: new Date()
                });
                await user.save();
            }
        }

        // 🛡️ MASTER STATUS SYNC:
        const allStatuses = order.items.map(i => i.itemStatus);
        
        if (allStatuses.every(s => s === 'Cancelled')) {
            // Ella seller-um cancel pannuna mattum dhaan moththa order status "Cancelled"
            order.status = 'Cancelled';
            order.paymentStatus = 'Refunded';
        } else {
            // Oru seller active-ah irundha order status 'Placed'-laye irukkanum (or use 'Partially Cancelled')
            order.status = 'Placed'; 
        }

        await order.save();
        res.json({ success: true, message: "Seller products cancelled. Main order stays active." });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/* =====================================================
    📈 5. TRACKING & WEBHOOK (Seller-Wise Handshake)
===================================================== */
exports.handleDelhiveryWebhook = async (req, res) => {
    try {
        const { waybill, status } = req.body;
        // Search order where any individual item has this waybill
        const order = await Order.findOne({ "items.itemAwbNumber": waybill });
        
        if (order) {
            order.items.forEach(item => {
                if (item.itemAwbNumber === waybill) {
                    // Forward Logic
                    if (status === 'Delivered') {
                        item.itemStatus = 'Delivered';
                        item.itemDeliveredDate = new Date();
                    } 
                    // Reverse Logic
                    else if (status === 'Picked Up' || status === 'In-Transit-Reverse') {
                        item.itemStatus = 'Return In-Progress';
                    }
                    else if (status === 'Delivered-to-Seller') {
                        item.itemStatus = 'Returned';
                        item.itemReturnDate = new Date();
                    }
                }
            });

            // Sync main order status if all are delivered
            if (order.items.every(i => i.itemStatus === 'Delivered')) {
                order.status = 'Delivered';
                order.deliveredDate = new Date();
            }

            await order.save();
        }
        res.status(200).send("OK");
    } catch (err) {
        res.status(500).send("Error");
    }
};

