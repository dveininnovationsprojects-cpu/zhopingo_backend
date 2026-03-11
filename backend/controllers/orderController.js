

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



exports.calculateLiveDeliveryRate = async (req, res) => {
    try {
        const { pincode, paymentMode, weightValue, unit, sellerPincode } = req.query;
        const origin = sellerPincode || "600001"; 

        // ⚖️ Frontend-la irundhu kooti anuppuna total weight (Ex: 1000)
        const totalWeight = Number(weightValue) || 500;
        const weightUnit = unit || 'g';

        // 📡 Step 1: Get Direct API Cost from Delhivery
        let actualApiCost = await getLiveShippingRate(pincode, totalWeight, weightUnit, origin, paymentMode);
     
        if (actualApiCost === 0) {
            console.log("⚠️ Staging API returned 0. Calculating based on Manual Weight Slabs...");
            const kg = universalWeightSync(totalWeight, weightUnit);
            // Manual Rule: 500g-ku 40rs base, every extra 500g-ku +15rs (Ex: 1kg = 55rs)
            actualApiCost = 40 + (Math.max(0, Math.ceil((kg - 0.5) / 0.5)) * 15);
        }
      
      
        const customerPayableCharge = Math.max(80, actualApiCost);
        const adminProfitFromDelivery = customerPayableCharge - actualApiCost;

        res.json({ 
            success: true, 
            finalCharge: customerPayableCharge,      // 👈 Screen-la kaata vendiyadhu
            actualLogisticsCost: actualApiCost,        // 👈 Delhivery partner-ku poguradhu
            adminLogisticsProfit: adminProfitFromDelivery, // 👈 Admin-ku vara profit
            appliedWeight: totalWeight + weightUnit
        });
    } catch (err) {
        console.error("Rate API Error:", err.message);
        res.status(500).json({ success: false, finalCharge: 80 });
    }
};

// /* =====================================================
//     🌟 2. MASTER CREATE ORDER (Finance & Multi-Seller)
// ===================================================== */
// exports.createOrder = async (req, res) => {
//     try {
//         const { items, customerId, shippingAddress, paymentMethod } = req.body;
//         const user = await User.findById(customerId);
//         if (!user) return res.status(404).json({ success: false, message: "User not found" });

//         const settings = await FinanceSettings.findOne() || { commissionPercent: 10, gstOnCommissionPercent: 18, tdsPercent: 2 };

//         let totalItemTotal = 0;
//         let totalCustomerPayableShipping = 0;
//         let sellerWiseSplit = {};
//         const processedItems = [];

//         for (const item of items) {
//             const productDoc = await Product.findById(item.productId || item._id);
//             const sellerDoc = await Seller.findById(productDoc?.seller || item.sellerId);
//             if (!productDoc || !sellerDoc) continue;

//             const subtotal = Number(item.price) * Number(item.quantity);
//             totalItemTotal += subtotal;
//             const weightKg = universalWeightSync(productDoc.weightValue || productDoc.weight, productDoc.unit) * item.quantity;
//             const pickupPin = sellerDoc.shopAddress?.pincode || sellerDoc.pincode || "600001";

//             const apiRate = await getLiveShippingRate(shippingAddress.pincode, productDoc.weightValue, productDoc.unit, pickupPin, paymentMethod);
//             const dynamicCharge = Math.max(80, Math.ceil(apiRate + ADMIN_MARGIN));

//             const sIdStr = sellerDoc._id.toString();
//             if (!sellerWiseSplit[sIdStr]) {
//                 sellerWiseSplit[sIdStr] = {
//                     sellerId: sellerDoc._id, shopName: sellerDoc.shopName,
//                     commissionPercent: settings.commissionPercent, sellerSubtotal: 0,
//                     deliveryDeductionFromSeller: 0, customerShippingForThisSeller: 0, totalWeightKg: 0
//                 };
//             }

//             if (productDoc.isFreeDelivery) {
//                 sellerWiseSplit[sIdStr].deliveryDeductionFromSeller = dynamicCharge; 
//             } else if (sellerWiseSplit[sIdStr].sellerSubtotal === 0) {
//                 sellerWiseSplit[sIdStr].customerShippingForThisSeller = dynamicCharge; 
//             }

//             processedItems.push({
//                 productId: productDoc._id, name: item.name, quantity: item.quantity,
//                 price: item.price, mrp: item.mrp || item.price, sellerId: sellerDoc._id,
//                 hsnCode: productDoc.hsnCode || "0000", weightKg: weightKg, image: item.image || ""
//             });

//             sellerWiseSplit[sIdStr].sellerSubtotal += subtotal;
//             sellerWiseSplit[sIdStr].totalWeightKg += weightKg;
//         }

//         const finalSellerSplitData = Object.values(sellerWiseSplit).map(split => {
//             const comm = (split.sellerSubtotal * split.commissionPercent) / 100;
//             const gst = (comm * settings.gstOnCommissionPercent) / 100;
//             const tds = (split.sellerSubtotal * settings.tdsPercent) / 100;
//             totalCustomerPayableShipping += split.customerShippingForThisSeller;

//             return {
//                 sellerId: split.sellerId, shopName: split.shopName, sellerSubtotal: split.sellerSubtotal,
//                 commissionTotal: comm, gstTotal: gst, tdsTotal: tds,
//                 deliveryDeduction: split.deliveryDeductionFromSeller,
//                 finalPayable: split.sellerSubtotal - (comm + gst + tds + split.deliveryDeductionFromSeller),
//                 totalWeightKg: split.totalWeightKg, status: 'Pending'
//             };
//         });

//         const finalTotalAmount = totalItemTotal + totalCustomerPayableShipping;

//         let paymentStatus = "Pending";
//         if (paymentMethod === "WALLET") {
//             if (user.walletBalance < finalTotalAmount) return res.status(400).json({ success: false, message: "Insufficient Balance" });
//             user.walletBalance -= finalTotalAmount;
//             user.walletTransactions.unshift({ amount: finalTotalAmount, type: 'DEBIT', reason: `Order Payment`, date: new Date() });
//             await user.save();
//             paymentStatus = "Paid";
//         }

//         const newOrder = new Order({
//             customerId: user._id, items: processedItems, sellerSplitData: finalSellerSplitData,
//             billDetails: { itemTotal: totalItemTotal, deliveryCharge: totalCustomerPayableShipping, totalAmount: finalTotalAmount },
//             totalAmount: finalTotalAmount, paymentMethod, shippingAddress, status: 'Placed', paymentStatus
//         });

//         await newOrder.save();
//         res.status(201).json({ success: true, order: newOrder });

//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };
/* =====================================================
    🌟 MASTER CREATE ORDER (All Logics Integrated)
===================================================== */
exports.createOrder = async (req, res) => {
    try {
        const { items, customerId, shippingAddress, paymentMethod } = req.body;
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

        // 🌟 STEP 1: Process Items & Sum up Weight per Seller
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
                    pickupPincode: sellerDoc.shopAddress?.pincode || sellerDoc.pincode || "600001",
                    sellerSubtotal: 0,
                    totalWeightGrams: 0,
                    isFreeDeliveryPackage: productDoc.isFreeDelivery // Logic sync
                };
            }

            // ⚖️ Weight Fix: unit weight * quantity (Ex: 500g * 2 = 1000g)
            sellerWiseSplit[sIdStr].totalWeightGrams += (Number(productDoc.weightValue || productDoc.weight || 500) * qty);
            sellerWiseSplit[sIdStr].sellerSubtotal += subtotal;

            processedItems.push({
                productId: productDoc._id, name: item.name, quantity: qty,
                price: item.price, mrp: item.mrp || item.price, sellerId: sellerDoc._id,
                hsnCode: productDoc.hsnCode || "0000",
                image: item.image || ""
            });
        }

        // 🌟 STEP 2: Calculate Dynamic Rates & Finance for Each Seller Package
        let finalCustomerShippingTotal = 0; // 👈 Fresh Counter for Grand Total

        const finalSellerSplitData = await Promise.all(Object.values(sellerWiseSplit).map(async (split) => {
            // 🚚 API Handshake: Sending Accumulated Weight (e.g., 2000g for noodles)
            const apiRate = await getLiveShippingRate(
                shippingAddress.pincode, 
                split.totalWeightGrams, 
                'g', 
                split.pickupPincode, 
                paymentMethod
            );

            /* =====================================================
                💰 PROFIT MODEL SYNC (The PhonePe Fix):
                Rule: API Cost + ADMIN_MARGIN (40rs). 
                Min floor strictly 80.
                Example: API 45 + 40 = ₹85 (Ippo katchithama DB-la vizhum!)
            ===================================================== */
            const dynamicCharge = Math.max(80, (apiRate + 40)); 
            
            const customerShippingCharge = split.isFreeDeliveryPackage ? 0 : dynamicCharge;
            const deliveryDeductionFromSeller = split.isFreeDeliveryPackage ? dynamicCharge : 0;
            
            finalCustomerShippingTotal += customerShippingCharge; // 👈 Handshake ippo katchithama vizhum

            // Finance Splits (GST/Commission)
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
                deliveryDeduction: deliveryDeductionFromSeller,
                adminProfitFromShipping: (customerShippingCharge > 0) ? (customerShippingCharge - apiRate) : 0,
                // Final Partner Payout
                finalPayable: split.sellerSubtotal - (comm + gst + tds + deliveryDeductionFromSeller),
                status: 'Pending'
            };
        }));

        // 🌟 FINAL TOTAL CALCULATION (Strictly syncing: 800 + 85 = 885)
        const finalTotalAmount = totalItemTotal + finalCustomerShippingTotal;

        // 🌟 STEP 3: Payment Status Logic
        let paymentStatus = "Pending";
        let orderStatus = "Pending"; 

        if (paymentMethod === "WALLET") {
            if (user.walletBalance < finalTotalAmount) return res.status(400).json({ success: false, message: "Insufficient Balance" });
            user.walletBalance -= finalTotalAmount;
            user.walletTransactions.unshift({ amount: finalTotalAmount, type: 'DEBIT', reason: `Order Payment`, date: new Date() });
            await user.save();
            paymentStatus = "Paid"; orderStatus = "Placed";
        }

        const newOrder = new Order({
            customerId: user._id,
            items: processedItems,
            sellerSplitData: finalSellerSplitData,
            billDetails: { 
                itemTotal: totalItemTotal, 
                deliveryCharge: finalCustomerShippingTotal, // 👈 Dynamically synced ippo ₹85 vizhum
                totalAmount: finalTotalAmount 
            },
            totalAmount: finalTotalAmount, // 🌟 THIS IS WHAT PHONEPE READS (₹885)
            paymentMethod,
            shippingAddress,
            status: orderStatus, 
            paymentStatus: paymentStatus
        });

        await newOrder.save();
        res.status(201).json({ success: true, order: newOrder });

    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};
/* =====================================================
    ❌ 3. CANCEL ORDER (Refund Logic)
===================================================== */
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (order.status !== 'Placed' && order.status !== 'Pending') {
            return res.status(400).json({ success: false, message: "Cancellation not possible." });
        }

        if (order.paymentStatus === 'Paid') {
            const user = await User.findById(order.customerId);
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + order.totalAmount;
                user.walletTransactions.unshift({ amount: order.totalAmount, type: 'CREDIT', reason: `Refund: Order #${order._id.toString().slice(-6).toUpperCase()}`, date: new Date() });
                await user.save();
                order.paymentStatus = 'Refunded';
            }
        } else { order.paymentStatus = 'Cancelled'; }

        order.status = 'Cancelled';
        await order.save();
        res.json({ success: true, message: "Order cancelled and refunded." });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

/* =====================================================
    🔍 4. THE PERIYA CRT FETCH LOGIC (Restored for Admin & User)
===================================================== */
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.params.userId })
            .populate('items.productId')
            .populate({ path: 'items.sellerId', select: 'shopName name address city' })
            .sort({ createdAt: -1 });

        const sanitizedOrders = orders.map(order => {
            const orderObj = order.toObject();
            return {
                ...orderObj,
                items: orderObj.items.map(item => ({
                    ...item,
                    sellerId: item.sellerId || { shopName: "Zhopingo Store", name: "Admin" }
                }))
            };
        });
        res.json({ success: true, data: sanitizedOrders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('customerId', 'name phone email')
            .populate('items.productId')
            .populate({ path: 'items.sellerId', select: 'name shopName city phone' })
            .sort({ createdAt: -1 });

        const sanitizedOrders = orders.map(order => ({
            ...order._doc,
            items: order.items.map(item => ({
                ...item._doc,
                sellerId: item.sellerId || { shopName: "Zhopingo Store", name: "Admin" }
            }))
        }));
        res.json({ success: true, data: sanitizedOrders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getSellerOrders = async (req, res) => {
    try {
        const orders = await Order.find({ "items.sellerId": req.params.sellerId })
            .populate('items.productId')
            .populate({ path: 'items.sellerId', select: 'shopName name address city' })
            .sort({ createdAt: -1 });

        const sanitizedOrders = orders.map(order => {
            const orderObj = order.toObject();
            return {
                ...orderObj,
                items: orderObj.items.map(item => ({
                    ...item,
                    sellerId: item.sellerId || { shopName: "Zhopingo Seller", name: "Merchant" }
                }))
            };
        });
        res.json({ success: true, data: sanitizedOrders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
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

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.orderId, { status }, { new: true }).populate({ path: 'items.sellerId', select: 'shopName name' });
        if (status === 'Delivered') order.paymentStatus = 'Paid';
        await order.save();
        res.json({ success: true, data: order });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.handleDelhiveryWebhook = async (req, res) => {
    try {
        const { waybill, status } = req.body;
        const order = await Order.findOne({ awbNumber: waybill });
        if (order) {
            order.status = (status === 'Delivered') ? 'Delivered' : 'Shipped';
            await order.save();
        }
        res.status(200).send("OK");
    } catch (err) { res.status(500).send("Error"); }
};

exports.bypassPaymentAndShip = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        order.paymentStatus = "Paid"; order.status = "Placed";
        await order.save();
        res.json({ success: true, data: order });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};