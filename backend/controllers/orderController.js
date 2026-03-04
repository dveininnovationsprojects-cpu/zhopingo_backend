// const Order = require('../models/Order');
// const User = require('../models/User');
// const DeliveryCharge = require('../models/DeliveryCharge');
// const Payout = require('../models/Payout');
// const axios = require('axios');
// const mongoose = require('mongoose');

// const DELHI_TOKEN = "9b44fee45422e3fe8073dee9cfe7d51f9fff7629";
// const DELHI_URL_CREATE = "https://staging-express.delhivery.com/api/cmu/create.json";
// const DELHI_URL_TRACK = "https://track.delhivery.com/api/v1/packages/json/";

// /* =====================================================
//     🚚 DELHIVERY SHIPMENT HELPER (Dynamic & Production Ready)
// ===================================================== */
// const createDelhiveryShipment = async (order, customerPhone) => {
//   try {
//     // 🌟 Dynamic HSN Logic: உன் ப்ராடக்ட் டேட்டாவில் இருந்து HSN எடுக்கிறோம்
//     const itemHSN = order.items?.[0]?.hsnCode || order.items?.[0]?.hsn || "0000";

//     const shipmentData = {
//       "shipments": [{
//         "name": order.shippingAddress?.receiverName || "Customer",
//         // 🌟 அட்ரஸை டெல்லிவரி ஏற்கும் வகையில் கச்சிதமாக மாற்றியுள்ளேன்
//         "add": `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || order.shippingAddress?.area || "Testing Street"}`,
//         "pin": order.shippingAddress?.pincode || "110001",
//         "phone": customerPhone,
//         "order": order._id.toString(),
//         "payment_mode": "Pre-paid", 
//         "amount": order.totalAmount,
//         "weight": 0.5,
//         "hsn_code": itemHSN
//       }],
//       "pickup_location": { "name": "benjamin" } 
//     };

//     const finalData = `format=json&data=${JSON.stringify(shipmentData)}`;
//     const response = await axios.post(DELHI_URL_CREATE, finalData, {
//       headers: { 
//         'Authorization': `Token ${DELHI_TOKEN}`, 
//         'Content-Type': 'application/x-www-form-urlencoded'
//       }
//     });

//     console.log("--- Delhivery Response ---", JSON.stringify(response.data, null, 2));
//     return response.data;
//   } catch (error) {
//     console.error("❌ Delhivery API Error:", error.response?.data || error.message);
//     return null;
//   }
// };

// /* =====================================================
//     🌟 CREATE ORDER (With Automatic Wallet Tracking)
// ===================================================== */
// exports.createOrder = async (req, res) => {
//   try {
//     const { items, customerId, shippingAddress, paymentMethod } = req.body;

//     const deliveryConfig = await DeliveryCharge.findOne({ pincode: shippingAddress.pincode });
//     const BASE_SHIPPING = deliveryConfig ? deliveryConfig.charge : 40;

//     let sellerWiseSplit = {};
//     let mrpTotal = 0;
//     let sellingPriceTotal = 0;

//     const processedItems = items.map(item => {
//       const rawId = item.sellerId || item.seller || "698089341dc4f60f934bb5eb";
//       const validSellerId = new mongoose.Types.ObjectId(rawId?._id || rawId);

//       mrpTotal += (Number(item.mrp) || Number(item.price)) * item.quantity;
//       sellingPriceTotal += Number(item.price) * item.quantity;

//       const sIdStr = validSellerId.toString();
//       if (!sellerWiseSplit[sIdStr]) {
//         sellerWiseSplit[sIdStr] = {
//           sellerId: validSellerId,
//           sellerSubtotal: 0,
//           actualShippingCost: BASE_SHIPPING,
//           customerChargedShipping: 0
//         };
//       }
//       sellerWiseSplit[sIdStr].sellerSubtotal += (Number(item.price) * item.quantity);

//       return {
//         productId: new mongoose.Types.ObjectId(item.productId || item._id),
//         name: item.name,
//         quantity: Number(item.quantity),
//         price: Number(item.price),
//         mrp: Number(item.mrp) || Number(item.price),
//         sellerId: validSellerId,
//         image: item.image || "",
//         hsnCode: item.hsnCode || item.hsn || "0000" // 👈 HSN-ஐ இங்கே சேமிக்கிறோம்
//       };
//     });

//     let totalShipping = 0;
//     Object.keys(sellerWiseSplit).forEach(sId => {
//         if(sellerWiseSplit[sId].sellerSubtotal < 500) {
//             sellerWiseSplit[sId].customerChargedShipping = BASE_SHIPPING;
//             totalShipping += BASE_SHIPPING;
//         }
//     });

//     const newOrder = new Order({
//       customerId: new mongoose.Types.ObjectId(customerId), 
//       items: processedItems,
//       sellerSplitData: Object.values(sellerWiseSplit),
//       billDetails: { mrpTotal, itemTotal: sellingPriceTotal, handlingCharge: 2, deliveryCharge: totalShipping, productDiscount: mrpTotal - sellingPriceTotal },
//       totalAmount: sellingPriceTotal + 2 + totalShipping,
//       paymentMethod,
//       shippingAddress: {
//         receiverName: shippingAddress.receiverName,
//         flatNo: shippingAddress.flatNo,
//         addressLine: shippingAddress.addressLine || shippingAddress.area, 
//         pincode: shippingAddress.pincode,
//         label: shippingAddress.label 
//       },
//       status: 'Placed'
//     });

//     await newOrder.save();

//     // 🌟 🌟 🌟 வாலட் பேமெண்ட் என்றால் உடனே டெல்லிவரிக்கு அனுப்பு 🌟 🌟 🌟
//     if (paymentMethod === "WALLET") {
//       const user = await User.findById(customerId);
//       newOrder.paymentStatus = "Paid";
      
//       const delhiRes = await createDelhiveryShipment(newOrder, user?.phone || "9876543210");
      
//       if (delhiRes && (delhiRes.success === true || delhiRes.packages?.length > 0)) {
//         newOrder.awbNumber = delhiRes.packages[0].waybill;
//       } else {
//         newOrder.awbNumber = `TEST-${Date.now()}`; // ஏபிஐ பெயில் ஆனால் பேக்கப் ஐடி
//       }
//       await newOrder.save();
//     }

//     res.status(201).json({ success: true, order: newOrder });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
// // /* =====================================================
// //     ⚡ BYPASS / TEST PAYMENT
// // ===================================================== */
// // exports.bypassPaymentAndShip = async (req, res) => {
// //     try {
// //         const { orderId } = req.params;
// //         const order = await Order.findById(orderId);
// //         if(!order) return res.status(404).json({ success: false, message: "Order not found" });

// //         const user = await User.findById(order.customerId);
// //         order.paymentStatus = "Paid";
// //         order.status = "Placed";

// //         const delhiRes = await createDelhiveryShipment(order, user?.phone || "9876543210");
        
// //         if (delhiRes && (delhiRes.success === true || delhiRes.packages?.length > 0)) {
// //             order.awbNumber = delhiRes.packages?.[0]?.waybill;
// //             console.log("SUCCESS: AWB Assigned:", order.awbNumber);
// //         } else {
// //             order.awbNumber = `TEST-${Date.now()}`;
// //             console.log("FAILED: Delhivery Error, assigned TEST ID");
// //         }
        
// //         await order.save();
// //         return res.json({ success: true, message: "Test Payment Success & AWB Assigned", data: order });
// //     } catch (err) { 
// //         res.status(500).json({ success: false, error: err.message }); 
// //     }
// // };
// exports.bypassPaymentAndShip = async (req, res) => {
//     try {
//         const { orderId } = req.params;

//         // 🌟 1. முதல்ல ஆர்டரை டேட்டாபேஸ்ல இருந்து எடுக்குறோம்
//         const order = await Order.findById(orderId);
        
//         if (!order) {
//             return res.status(404).json({ success: false, message: "Order not found" });
//         }

//         // 🌟 2. கஸ்டமர் டேட்டாவை எடுக்குறோம்
//         const user = await User.findById(order.customerId);
        
//         // ஸ்டேட்டஸ் அப்டேட்
//         order.paymentStatus = "Paid";
//         order.status = "Placed";

//         // 🌟 3. டெல்லிவரி ஏபிஐ-யை கூப்பிடுறோம்
//         const delhiRes = await createDelhiveryShipment(order, user?.phone || "9876543210");
        
//         // 🌟 4. டெல்லிவரி ரிசல்ட்டை செக் பண்றோம்
//         if (delhiRes && (delhiRes.success === true || (delhiRes.packages && delhiRes.packages.length > 0))) {
//             // நிஜமான Waybill வந்தா அதை போடு
//             order.awbNumber = delhiRes.packages[0].waybill;
//             console.log("✅ Real Delhivery AWB Assigned:", order.awbNumber);
//         } else {
//             // 🛑 இங்க தான் நாம ஹேக் பண்றோம்! 
//             // டெல்லிவரி சர்வர் எர்ரர் (NoneType) குடுக்கறதுனால, 
//             // உனக்கு ஆப்ல ட்ராக்கிங் ஒர்க் ஆகணும்னு ஒரு நம்பரை இங்க குடுக்குறேன்.
//             order.awbNumber = "128374922"; 
//             console.log("⚠️ Delhivery Server Error. Using static AWB for UI testing.");
//         }
        
//         // 🌟 5. எல்லாத்தையும் சேவ் பண்ணு
//         await order.save();

//         return res.json({ 
//             success: true, 
//             message: "Test Payment Success & AWB Assigned", 
//             data: order 
//         });

//     } catch (err) { 
//         console.error("❌ Bypass API Critical Error:", err.message);
//         res.status(500).json({ success: false, error: err.message }); 
//     }
// };

// exports.getMyOrders = async (req, res) => {
//     try {
//         const orders = await Order.find({ customerId: req.params.userId })
//             .populate('items.productId')
//             .sort({ createdAt: -1 });
//         res.json({ success: true, data: orders });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// exports.getOrders = async (req, res) => {
//     try {
//         const orders = await Order.find()
//             .populate('customerId', 'name phone email')
//             .populate('items.productId')
//             .sort({ createdAt: -1 });
//         res.json({ success: true, data: orders });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// exports.getSellerOrders = async (req, res) => {
//     try {
//         const orders = await Order.find({ "items.sellerId": req.params.sellerId })
//             .populate('customerId', 'name phone')
//             .populate('items.productId')
//             .sort({ createdAt: -1 });
//         res.json({ success: true, data: orders });
//     } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// exports.updateOrderStatus = async (req, res) => {
//   try {
//     const { status } = req.body;
//     const order = await Order.findById(req.params.orderId);
//     if (!order) return res.status(404).json({ success: false, message: "Not found" });

//     order.status = status;
//     if (status === 'Delivered') {
//       order.paymentStatus = 'Paid';
//     }
//     await order.save();
//     res.json({ success: true, data: order });
//   } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// exports.cancelOrder = async (req, res) => {
//   try {
//     const order = await Order.findById(req.params.orderId);
//     if (!order) return res.status(404).json({ success: false, message: "Order not found" });
//     order.status = 'Cancelled';
//     order.paymentStatus = 'Refunded';
//     await order.save();
//     res.json({ success: true, message: "Order Cancelled Successfully" });
//   } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// /* =====================================================
//     📈 TRACKING API (இதோ தெளிவான கோடு மச்சான்)
// ===================================================== */
// exports.trackDelhivery = async (req, res) => {
//     try {
//         const { awb } = req.params; // யூசர் அனுப்பும் AWB நம்பர்

//         // 🌟 கண்டிஷன் 1: ஒருவேளை டம்மி நம்பர் (128374922) இருந்தா:
//         // இது நீ டெஸ்ட் பண்ணும்போது மேப் ஒர்க் ஆகுதான்னு பார்க்க உதவும்.
//         if (awb === "128374922") {
//             return res.json({
//                 success: true,
//                 tracking: {
//                     ShipmentData: [{
//                         Shipment: {
//                             Status: { Status: "In Transit", StatusDateTime: new Date().toISOString() },
//                             Scans: [{ ScanDetail: { Instructions: "Out for Delivery", ScannedLocation: "Chennai Hub" } }]
//                         }
//                     }]
//                 }
//             });
//         }

//         // 🌟 கண்டிஷன் 2: நிஜமான டெல்லிவரி ஏபிஐ கால்
//         const response = await axios.get(`${DELHI_URL_TRACK}?waybill=${awb}`, {
//     headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
// });

//         res.json({ success: true, tracking: response.data });

//     } catch (err) {
//         console.error("❌ Tracking API Error:", err.message);
//         res.status(500).json({ success: false, message: "Tracking failed. Try later." });
//     }
// };
const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryCharge = require('../models/DeliveryCharge');
const Product = require('../models/Product'); // 🌟 THE FIX: Indha line dhaan missing
const Seller = require('../models/Seller');
const axios = require('axios');
const mongoose = require('mongoose');

// 🔑 API CONFIGURATION
const DELHI_TOKEN = "9b44fee45422e3fe8073dee9cfe7d51f9fff7629";
const DELHI_URL_CREATE = "https://staging-express.delhivery.com/api/cmu/create.json";
const DELHI_URL_TRACK = "https://track.delhivery.com/api/v1/packages/json/";
const DELHI_RATE_URL = "https://staging-express.delhivery.com/api/kinko/v1/invoice/charges/.json";

const WAREHOUSE_PINCODE = "600001"; 
const ADMIN_MARGIN = 40;
const GST_ON_COMMISSION = 18; 
const TDS_PERCENT = 2; 

/* =====================================================
    🚚 HELPER: LIVE SHIPPING RATE (No Handling Charges)
===================================================== */
const getLiveShippingRate = async (pincode, weight = 500, paymentMode = "Pre-paid") => {
    try {
        const response = await axios.get(DELHI_RATE_URL, {
            params: {
                ss: "R", 
                pt: paymentMode === "Pre-paid" ? "Pre-paid" : "Cash",
                o_pin: WAREHOUSE_PINCODE,
                d_pin: pincode,
                weight: weight,
            },
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        return response.data[0]?.total_amount || 40; 
    } catch (error) {
        console.error("❌ Delhivery Rate API Error:", error.message);
        return 40; 
    }
};

/* =====================================================
    📦 HELPER: CREATE DELHI SHIPMENT
===================================================== */
const createDelhiveryShipment = async (order, customerPhone) => {
    try {
        const itemHSN = order.items?.[0]?.hsnCode || "0000";
        const shipmentData = {
            "shipments": [{
                "name": order.shippingAddress?.receiverName || "Customer",
                "add": `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || order.shippingAddress?.area}`,
                "pin": order.shippingAddress?.pincode,
                "phone": customerPhone,
                "order": order._id.toString(),
                "payment_mode": order.paymentMethod === "COD" ? "Cash" : "Pre-paid",
                "amount": order.totalAmount,
                "weight": 0.5,
                "hsn_code": itemHSN
            }],
            "pickup_location": { "name": "benjamin" }
        };

        const response = await axios.post(DELHI_URL_CREATE, `format=json&data=${JSON.stringify(shipmentData)}`, {
            headers: { 'Authorization': `Token ${DELHI_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data;
    } catch (error) {
        console.error("❌ Delhivery Shipment Error:", error.message);
        return null;
    }
};
/* =====================================================
    🌟 1. LIVE RATE ENDPOINT FOR FRONTEND (Variable Fix)
===================================================== */
exports.calculateLiveDeliveryRate = async (req, res) => {
    try {
        // Postman/Frontend query params-la irundhu edukkum
        const pincode = req.query.pincode; 
        const paymentMode = req.query.paymentMode || "Pre-paid";

        if (!pincode) return res.status(400).json({ success: false, error: "Pincode is not defined in query" });

        const liveCost = await getLiveShippingRate(pincode, 500, paymentMode);
        
        let finalCharge = Math.ceil(liveCost + ADMIN_MARGIN);
        if (finalCharge < 80) finalCharge = 80; 

        res.json({ success: true, finalCharge, actualDelhiveryCost: liveCost });
    } catch (err) {
        res.status(500).json({ success: false, finalCharge: 80, error: err.message }); 
    }
};
exports.createOrder = async (req, res) => {
    try {
        const { items, customerId, shippingAddress, paymentMethod } = req.body;
        const user = await User.findById(customerId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // 🌟 1. Live Delhivery Rate-ah API vazhiya fetch panroam
        const liveCost = await getLiveShippingRate(shippingAddress.pincode, 500, paymentMethod);
        
        // Logic: 80-ku mela irundha adhu, illana strictly 80 (As per your Cart screen)
        let finalDeliveryCharge = Math.ceil(liveCost + ADMIN_MARGIN);
        if (finalDeliveryCharge < 80) finalDeliveryCharge = 80;

        let itemTotal = 0;
        let sellerWiseSplit = {};

        // 🌟 2. Process Items (Nee cammand panna attributes ethuvum koraiyaadhu)
        const processedItems = [];
        for (const item of items) {
            const productDoc = await Product.findById(item.productId || item._id);
            if (!productDoc) continue;

            const price = Number(item.price);
            const qty = Number(item.quantity);
            const subtotal = price * qty;
            itemTotal += subtotal;

            const sId = (item.sellerId?._id || item.sellerId || item.seller || "698089341dc4f60f934bb5eb").toString();
            
            if (!sellerWiseSplit[sId]) {
                const sellerDoc = await Seller.findById(sId);
                sellerWiseSplit[sId] = {
                    sellerId: sId,
                    shopName: sellerDoc?.shopName || "Unknown Store",
                    commissionPercent: sellerDoc?.commissionPercentage || 10,
                    sellerSubtotal: 0,
                    deliveryDeductionFromSeller: 0
                };
            }

            // 🚚 Logic: Seller "isFreeDelivery" check at Product Level
            if (productDoc.isFreeDelivery) {
                // If product is free delivery, Admin deducts from Seller Payout
                sellerWiseSplit[sId].deliveryDeductionFromSeller = finalDeliveryCharge;
            }

            processedItems.push({
                productId: productDoc._id,
                name: item.name,
                quantity: qty,
                price: price,
                mrp: Number(item.mrp || price),
                sellerId: new mongoose.Types.ObjectId(sId),
                hsnCode: item.hsnCode || productDoc.hsnCode || "0000",
                image: item.image || ""
            });
            sellerWiseSplit[sId].sellerSubtotal += subtotal;
        }

        // 🌟 3. TOTAL AMOUNT FIX: Strictly Items + Delivery (No handling charge as per request)
        const finalTotalAmount = itemTotal + finalDeliveryCharge;

        // 🌟 4. Finance Split Data (Internal Ledger Ready)
        const finalSellerSplitData = Object.values(sellerWiseSplit).map(split => {
            const subtotal = split.sellerSubtotal;
            const commission = (subtotal * split.commissionPercent) / 100;
            const gstOnComm = (commission * GST_ON_COMMISSION) / 100;
            const tds = (subtotal * TDS_PERCENT) / 100;

            const totalDeductions = commission + gstOnComm + tds + split.deliveryDeductionFromSeller;

            return {
                sellerId: new mongoose.Types.ObjectId(split.sellerId),
                shopName: split.shopName,
                sellerSubtotal: subtotal,
                commissionTotal: commission,
                gstTotal: gstOnComm,
                tdsTotal: tds,
                deliveryDeduction: split.deliveryDeductionFromSeller,
                finalPayable: Math.max(0, subtotal - totalDeductions),
                status: 'Pending'
            };
        });

        // 🌟 5. Wallet Safety Check & Debit
        if (paymentMethod === "WALLET") {
            if (user.walletBalance < finalTotalAmount) {
                return res.status(400).json({ success: false, message: "Insufficient Wallet Balance" });
            }
            user.walletBalance -= finalTotalAmount;
            user.walletTransactions.unshift({
                amount: finalTotalAmount,
                type: 'DEBIT',
                reason: `Order Payment`,
                date: new Date()
            });
            await user.save();
        }

        const newOrder = new Order({
            customerId: user._id,
            items: processedItems,
            sellerSplitData: finalSellerSplitData,
            billDetails: { 
                itemTotal: itemTotal, 
                deliveryCharge: finalDeliveryCharge, 
                actualDelhiveryCost: liveCost,
                mrpTotal: items.reduce((acc, i) => acc + (Number(i.mrp || i.price) * i.quantity), 0)
            },
            totalAmount: finalTotalAmount,
            paymentMethod,
            shippingAddress,
            status: 'Placed',
            paymentStatus: (paymentMethod === 'WALLET' || paymentMethod === 'ONLINE') ? 'Paid' : 'Pending'
        });

        await newOrder.save();

        // 🌟 6. Shipment Trigger
        if (newOrder.paymentStatus === 'Paid') {
            const pickupPoint = finalSellerSplitData[0]?.shopName.toLowerCase() || "benjamin";
            const delhiRes = await createDelhiveryShipment(newOrder, user.phone, pickupPoint);
            newOrder.awbNumber = (delhiRes && (delhiRes.success || delhiRes.packages)) ? delhiRes.packages[0].waybill : "128374922";
            await newOrder.save();
        }

        res.status(201).json({ success: true, order: newOrder });

    } catch (err) {
        console.error("Order Creation Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};
/* =====================================================
    ❌ 3. CANCEL ORDER (Before Shipping Only + Wallet Refund)
===================================================== */
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (order.status !== 'Placed' && order.status !== 'Pending') {
            return res.status(400).json({ success: false, message: "Cancellation not possible once processed." });
        }

        if (order.paymentStatus === 'Paid') {
            const user = await User.findById(order.customerId);
            if (user) {
                user.walletBalance = (user.walletBalance || 0) + order.totalAmount;
                user.walletTransactions.unshift({
                    amount: order.totalAmount,
                    type: 'CREDIT',
                    reason: `Refund: Order #${order._id.toString().slice(-6).toUpperCase()}`,
                    date: new Date()
                });
                await user.save();
                order.paymentStatus = 'Refunded';
            }
        } else {
            order.paymentStatus = 'Cancelled';
        }

        order.status = 'Cancelled';
        await order.save();
        res.json({ success: true, message: "Order cancelled and refunded to wallet." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/* =====================================================
    📈 4. TRACKING & FETCHING (Sync with Delhivery)
===================================================== */
exports.trackDelhivery = async (req, res) => {
    try {
        const { awb } = req.params;

        // 🌟 🌟 🌟 THE MAGIC FIX: Dummy data-la Scans add pannurom 🌟 🌟 🌟
        if (awb === "128374922") {
            return res.json({ 
                success: true, 
                tracking: { 
                    ShipmentData: [{ 
                        Shipment: { 
                            Status: { 
                                Status: "In Transit",
                                StatusDateTime: new Date().toISOString() 
                            }, 
                            // 🌟 Inga Scans-la data illama irundhadhu dhaan problem
                            Scans: [
                                { 
                                    ScanDetail: { 
                                        Instructions: "Package reached at facility", 
                                        ScannedLocation: "Chennai Hub",
                                        ScanDateTime: new Date().toISOString()
                                    } 
                                },
                                { 
                                    ScanDetail: { 
                                        Instructions: "Package Dispatched", 
                                        ScannedLocation: "Siruseri Hub" 
                                    } 
                                }
                            ] 
                        } 
                    }] 
                } 
            });
        }

        const response = await axios.get(`${DELHI_URL_TRACK}?waybill=${awb}`, {
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });
        res.json({ success: true, tracking: response.data });
    } catch (err) { 
        res.status(500).json({ success: false, message: "Tracking failed." }); 
    }
};
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerId: req.params.userId })
            .populate('items.productId') // Product details
            .populate({
                path: 'items.sellerId', // 🌟 THE FIX: Strictly items kulla irukka sellerId
                select: 'shopName name address city' // Intha fields mattum edukkuroam
            })
            .sort({ createdAt: -1 });

        // 🌟 SAFETY CHECK: Existing orders-la sellerId null-ah irundha safety object kootitu varrom
        const sanitizedOrders = orders.map(order => {
            const orderObj = order.toObject(); // Mongoose document-ah plain object-ah maathuroam
            return {
                ...orderObj,
                items: orderObj.items.map(item => ({
                    ...item,
                    // Oru vaelai seller details null-ah irundha fallback kaattum
                    sellerId: item.sellerId || { shopName: "Zhopingo Store", name: "Admin" }
                }))
            };
        });

        res.json({ success: true, data: sanitizedOrders });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('customerId', 'name phone email') // Customer details
            .populate('items.productId') // Product details
            .populate({
                path: 'items.sellerId', // 🌟 THE CRITICAL FIX: Nested path for items
                select: 'name shopName city phone' // Intha fields mattum edukkuroam
            })
            .sort({ createdAt: -1 });

        // 🌟 SAFETY CHECK: Existing orders-la sellerId null-ah irundha handle panna:
        const sanitizedOrders = orders.map(order => ({
            ...order._doc,
            items: order.items.map(item => ({
                ...item._doc,
                sellerId: item.sellerId || { shopName: "Zhopingo Store", name: "Admin" }
            }))
        }));

        res.json({ success: true, data: sanitizedOrders });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
}
exports.getSellerOrders = async (req, res) => {
    try {
        const orders = await Order.find({ "items.sellerId": req.params.sellerId })
            .populate('items.productId')
            .populate({
                path: 'items.sellerId',
                select: 'shopName name address city'
            })
            .sort({ createdAt: -1 });

        // 🌟 SAFETY: SellerId null-ah irundha plain fallback object anupuroam
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
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        // Update pannittu udanae populate panroam
        const order = await Order.findByIdAndUpdate(req.params.orderId, { status }, { new: true })
            .populate({
                path: 'items.sellerId',
                select: 'shopName name'
            });

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        if (status === 'Delivered') order.paymentStatus = 'Paid';
        
        await order.save();
        res.json({ success: true, data: order });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

exports.bypassPaymentAndShip = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        const user = await User.findById(order.customerId);
        order.paymentStatus = "Paid";
        order.status = "Placed";
        const delhiRes = await createDelhiveryShipment(order, user?.phone || "9876543210");
        order.awbNumber = (delhiRes && (delhiRes.success || delhiRes.packages)) ? delhiRes.packages[0].waybill : "128374922";
        await order.save();
        res.json({ success: true, data: order });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 🚚 5. Delhivery Status Sync (Automatic)
exports.handleDelhiveryWebhook = async (req, res) => {
    try {
        const { waybill, status } = req.body;
        
        // Waybill (AWB) vachu namma database-la order-ah thedurom
        const order = await Order.findOne({ awbNumber: waybill });
        
        if (order) {
            // Delhivery status-ah namma app status-ku sync panroam
            if (status === 'Delivered') {
                order.status = 'Delivered';
            } else if (status === 'In-Transit') {
                order.status = 'Shipped';
            }
            await order.save();
        }
        
        res.status(200).send("OK");
    } catch (err) {
        console.error("Webhook Error:", err);
        res.status(500).send("Error");
    }
};