

// const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = require("pg-sdk-node");
// const Order = require("../models/Order");
// const User = require("../models/User");
// const axios = require("axios");

// // 🔑 PHONEPE SDK INITIALIZATION
// const client = StandardCheckoutClient.getInstance(
//   process.env.PHONEPE_CLIENT_ID,
//   process.env.PHONEPE_CLIENT_SECRET,
//   parseInt(process.env.PHONEPE_CLIENT_VERSION),
//   process.env.PHONEPE_ENV === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX
// );

// /* =====================================================
//     🚚 DELHIVERY SHIPMENT HELPER (Real-World Standard)
// ===================================================== */
// const createDelhiveryShipment = async (order, customerPhone, pickupName, weight) => {
//   try {
//     const itemHSN = order.items?.[0]?.hsnCode || "0000";

//     const shipmentData = {
//       shipments: [{
//         name: order.shippingAddress?.receiverName || "Customer",
//         add: `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || order.shippingAddress?.area || ""}`,
//         pin: order.shippingAddress?.pincode,
//         phone: customerPhone,
//         order: order._id.toString(),
//         payment_mode: "Pre-paid",
//         amount: order.totalAmount,
//         weight: weight || 0.5, // 🌟 Dynamic weight from Order logic
//         hsn_code: itemHSN,
//       }],
//       pickup_location: { name: pickupName }, // 🌟 Dynamic pickup from Seller login
//     };

//     const DELHI_URL = process.env.DELHIVERY_ENV === "PRODUCTION" 
//       ? "https://track.delhivery.com/api/cmu/create.json" 
//       : "https://staging-express.delhivery.com/api/cmu/create.json";

//     const response = await axios.post(
//       DELHI_URL,
//       `format=json&data=${JSON.stringify(shipmentData)}`,
//       {
//         headers: {
//           Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       }
//     );
//     return response.data;
//   } catch (error) {
//     console.error("❌ Delhivery API Error:", error.response?.data || error.message);
//     return null;
//   }
// };

// // const updateOrderSuccess = async (orderId) => {
// //   try {
// //     const order = await Order.findById(orderId);
// //     if (!order || order.paymentStatus === "Paid") return true;

// //     const user = await User.findById(order.customerId);
// //     order.paymentStatus = "Paid";
// //     order.status = "Placed";

// //     // 🌟 THE TRIGGER: Payment confirm aana aprom dhaan Shipment create aaganum
// //     const firstSeller = order.sellerSplitData[0];
// //     const pickupName = firstSeller?.shopName || "benjamin";
// //     const weight = firstSeller?.totalWeightKg || 0.5;

// //     const delhiRes = await createDelhiveryShipment(order, user?.phone || "9876543210", pickupName, weight);

// //     if (delhiRes && (delhiRes.success === true || delhiRes.packages?.length > 0)) {
// //         order.awbNumber = delhiRes.packages[0].waybill;
// //         console.log("✅ Blinkit Sync: AWB Generated", order.awbNumber);
// //     } else {
// //         order.awbNumber = "128374922"; // Staging fallback
// //     }

// //     await order.save();
// //     return true;
// //   } catch (err) {
// //     console.error("❌ updateOrderSuccess Error:", err.message);
// //     return false;
// //   }
// // };
// /* =====================================================
//     💳 PHONEPE SESSION & CALLBACKS
// ===================================================== */

// exports.createSession = async (req, res) => {
//   try {
//     const { orderId } = req.body;
//     const order = await Order.findById(orderId);
//     if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//     const request = StandardCheckoutPayRequest.builder()
//       .merchantOrderId(order._id.toString())
//       .amount(Math.round(order.totalAmount * 100))
//       .redirectUrl(`https://api.zhopingo.in/api/v1/payments/phonepe-return/${orderId}`)
//       .build();

//     const response = await client.pay(request);
//     const checkoutUrl = response.redirect_url || response.redirectUrl || response.data?.instrumentResponse?.redirectInfo?.url;

//     res.json({ success: true, url: checkoutUrl, phonepeOrderId: response.order_id || response.orderId });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// exports.verifyPayment = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const response = await client.getOrderStatus(orderId);

//     if (response.state === "COMPLETED") {
//       await updateOrderSuccess(orderId);
//       return res.json({ success: true });
//     }
//     res.status(400).json({ success: false, state: response.state });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// // exports.phonepeReturn = async (req, res) => {
// //   try {
// //     const { orderId } = req.params;
// //     await updateOrderSuccess(orderId); 

// //     const deepLink = `zhopingo://payment-verify/${orderId}`;

// //     res.send(`
// //       <!DOCTYPE html>
// //       <html>
// //         <head>
// //           <meta name="viewport" content="width=device-width, initial-scale=1.0">
// //           <title>Zhopingo Payment</title>
// //         </head>
// //         <body style="text-align:center; padding-top:50px; font-family:sans-serif;">
// //           <h2 style="color: #0c831f;">Payment Successful!</h2>
// //           <p>Redirecting you back to the app...</p>
// //           <a href="${deepLink}" id="redirectBtn" style="background:#0c831f; color:#fff; padding:15px 30px; text-decoration:none; border-radius:10px; font-weight:bold;">Return to App</a>
// //           <script>
// //             window.location.href = "${deepLink}";
// //             setTimeout(function() { document.getElementById('redirectBtn').click(); }, 1500);
// //           </script>
// //         </body>
// //       </html>
// //     `);
// //   } catch (error) {
// //     res.status(500).send("Internal Server Error");
// //   }
// // };

// const updateOrderSuccess = async (orderId) => {
//   try {
//     const order = await Order.findById(orderId);
//     if (!order || order.paymentStatus === "Paid") return true;

//     order.paymentStatus = "Paid";
//     order.status = "Placed";

//     // 🚀 THE MASTER SYNC FIX: Individual tracking per seller inside the array
//     const fallbackAWB = "128374922";
    
//     // 1️⃣ Sync sellerSplitData array (Status & AWB inside the object)
//     if (order.sellerSplitData && order.sellerSplitData.length > 0) {
//         order.sellerSplitData.forEach(split => {
//             split.packageStatus = 'Placed';
//             split.awbNumber = fallbackAWB; // 🌟 Ippo array object kulla register aagum
//         });
//     }

//     // 2️⃣ Sync individual items for Frontend logic alignment
//     if (order.items && order.items.length > 0) {
//         order.items.forEach(item => {
//             item.itemStatus = 'Placed';
//             item.itemAwbNumber = fallbackAWB; // 🌟 Individual item level tracking
//         });
//     }

//     // Legacy sync (safety-ku general level-laiyum irukkatum)
//     order.awbNumber = fallbackAWB;

//     console.log("✅ Split Tracking Engine: All packages synced with individual AWB.");

//     await order.save();
//     return true;
//   } catch (err) {
//     console.error("❌ updateOrderSuccess Error:", err.message);
//     return false;
//   }
// };

// /* =====================================================
//     📞 PHONEPE RETURN Handshake (Direct Success Redirect)
// ===================================================== */
// exports.phonepeReturn = async (req, res) => {
//   try {
//     const { orderId } = req.params;

//     // Sandbox-la status trigger aaga delay aanaalum, return URL hit aanaale
//     // namma oru status check panni forced sync pannanum
//     const response = await client.getOrderStatus(orderId);

//     if (response.state === "COMPLETED") {
//         await updateOrderSuccess(orderId); // 🌟 Trigger status change
        
//         // Frontend Deep Link with Success flag
//         const deepLink = `zhopingo://payment-verify/${orderId}?status=success`;
//         return res.redirect(deepLink);
//     } else {
//         const deepLink = `zhopingo://payment-verify/${orderId}?status=failed`;
//         return res.redirect(deepLink);
//     }
//   } catch (error) {
//     console.error("Return URL Error:", error.message);
//     // Safety fallback sync
//     await updateOrderSuccess(orderId); 
//     res.redirect(`zhopingo://payment-verify/${orderId}?status=success`);
//   }
// };
// exports.webhook = async (req, res) => {
//   try {
//     const response = req.body;
//     const orderId = response.merchantOrderId || response.data?.merchantOrderId;
//     const status = response.state || response.data?.state;
//     if (status === "COMPLETED") await updateOrderSuccess(orderId);
//     res.status(200).send("OK");
//   } catch (error) { 
//     res.status(500).send("Error"); 
//   }
// };



const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = require("pg-sdk-node");
const Order = require("../models/Order");
const User = require("../models/User");
const Seller = require("../models/Seller");
const axios = require("axios");
const crypto = require("crypto");

// 🛠️ ENVIRONMENT TOGGLE
const IS_PROD = process.env.NODE_ENV === "production";

// 🔑 PHONEPE SDK INITIALIZATION (Auto-Switch)
const client = StandardCheckoutClient.getInstance(
    process.env.PHONEPE_CLIENT_ID,
    process.env.PHONEPE_CLIENT_SECRET,
    parseInt(process.env.PHONEPE_CLIENT_VERSION),
    IS_PROD ? Env.PRODUCTION : Env.SANDBOX
);

/* =====================================================
    🚚 MULTI-SELLER SHIPMENT ENGINE (The Blinkit Standard)
    (Ovvoru seller-ukkum thonithaniya shipment book pannum)
===================================================== */
const createDelhiveryShipment = async (order, sellerItems, sellerDoc, customerPhone) => {
    try {
        const DELHI_URL = IS_PROD 
            ? "https://track.delhivery.com/api/cmu/create.json" 
            : "https://staging-express.delhivery.com/api/cmu/create.json";

        // Logic: Calculate total weight for this specific seller's items
        const totalWeight = sellerItems.reduce((sum, it) => sum + (Number(it.weight || 500) * it.quantity), 0) / 1000;

        const shipmentData = {
            shipments: [{
                name: order.shippingAddress?.receiverName || "Customer",
                add: `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.area || ""}`,
                pin: order.shippingAddress?.pincode,
                phone: customerPhone,
                order: `${order._id}_${sellerDoc._id}`, // Unique sub-order ref for multi-seller
                payment_mode: "Pre-paid",
                amount: order.totalAmount, // Overall order reference
                weight: totalWeight > 0 ? totalWeight : 0.5,
                hsn_code: sellerItems[0]?.hsnCode || "0000",
            }],
            pickup_location: { name: sellerDoc.shopName }, // Registered Seller Pickup Point
        };

        const response = await axios.post(
            DELHI_URL,
            `format=json&data=${JSON.stringify(shipmentData)}`,
            {
                headers: {
                    'Authorization': `Token ${process.env.DELHIVERY_TOKEN}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error(`❌ Delhivery Error for Seller ${sellerDoc.shopName}:`, error.message);
        return null;
    }
};

/* =====================================================
    🌟 MASTER SYNC: updateOrderSuccess
    (Handles Real Booking vs Fallback Sandbox)
===================================================== */
const updateOrderSuccess = async (orderId) => {
    try {
        const order = await Order.findById(orderId);
        if (!order || order.paymentStatus === "Paid") return true;

        const customer = await User.findById(order.customerId);
        order.paymentStatus = "Paid";
        order.status = "Placed";

        // 🚀 LOOP: Book individual shipment for each seller in the cart
        for (let split of order.sellerSplitData) {
            const sellerDoc = await Seller.findById(split.sellerId);
            const sellerItems = order.items.filter(it => it.sellerId.toString() === split.sellerId.toString());

            if (sellerDoc) {
                // PRODUCTION-la irundha mattum Delhivery API-ah hit pannum
                let delhiRes = IS_PROD ? await createDelhiveryShipment(order, sellerItems, sellerDoc, customer?.phone) : null;

                if (delhiRes && delhiRes.packages && delhiRes.packages.length > 0) {
                    const realAWB = delhiRes.packages[0].waybill;
                    split.awbNumber = realAWB;
                    split.packageStatus = "Placed";
                    
                    // Individual item-level tracking sync
                    order.items.forEach(item => {
                        if (item.sellerId.toString() === split.sellerId.toString()) {
                            item.itemAwbNumber = realAWB;
                            item.itemStatus = "Placed";
                        }
                    });
                } else {
                    // SANDBOX FALLBACK: Testing purposes only
                    const fallbackAWB = IS_PROD ? "RETRY_REQUIRED" : "128374922";
                    split.awbNumber = fallbackAWB;
                    split.packageStatus = IS_PROD ? "Shipping_Failed" : "Placed";
                    
                    order.items.forEach(item => {
                        if (item.sellerId.toString() === split.sellerId.toString()) {
                            item.itemAwbNumber = fallbackAWB;
                            item.itemStatus = IS_PROD ? "Shipping_Failed" : "Placed";
                        }
                    });
                }
            }
        }

        await order.save();
        return true;
    } catch (err) {
        console.error("❌ updateOrderSuccess Critical Error:", err.message);
        return false;
    }
};

/* =====================================================
    💳 PHONEPE SESSION & SECURITY HANDSHAKE
===================================================== */
exports.createSession = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const request = StandardCheckoutPayRequest.builder()
            .merchantOrderId(order._id.toString())
            .amount(Math.round(order.totalAmount * 100))
            // Live domain switch
            .redirectUrl(`${process.env.BASE_URL}/api/v1/payments/phonepe-return/${orderId}`)
            .build();

        const response = await client.pay(request);
        const checkoutUrl = response.redirect_url || response.data?.instrumentResponse?.redirectInfo?.url;

        res.json({ success: true, url: checkoutUrl, phonepeOrderId: response.order_id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        // 🛡️ SECURITY: Server-side API check (Not just client redirect)
        const response = await client.getOrderStatus(orderId);

        if (response.state === "COMPLETED" || response.code === "PAYMENT_SUCCESS") {
            await updateOrderSuccess(orderId);
            return res.json({ success: true });
        }
        res.status(400).json({ success: false, state: response.state });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/* =====================================================
    📞 WEBHOOK: THE REAL-TIME SYNC (High Priority)
===================================================== */
exports.webhook = async (req, res) => {
    try {
        const base64Payload = req.body.response;
        const decodedPayload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'));
        
        // 🛡️ PRODUCTION CHECKSUM VALIDATION (Preventing Fraud)
        if (IS_PROD) {
            const xVerifyHeader = req.headers['x-verify'];
            const checksum = crypto.createHash('sha256')
                .update(base64Payload + process.env.PHONEPE_SALT_KEY)
                .digest('hex') + "###" + process.env.PHONEPE_SALT_INDEX;

            if (xVerifyHeader !== checksum) {
                return res.status(400).send("Invalid Signature");
            }
        }

        const orderId = decodedPayload.data.merchantOrderId;
        const status = decodedPayload.code;

        if (status === "PAYMENT_SUCCESS") {
            await updateOrderSuccess(orderId);
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("Webhook Error:", error.message);
        res.status(500).send("Error");
    }
};

exports.phonepeReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const response = await client.getOrderStatus(orderId);

        if (response.state === "COMPLETED") {
            await updateOrderSuccess(orderId);
            return res.redirect(`zhopingo://payment-verify/${orderId}?status=success`);
        }
        res.redirect(`zhopingo://payment-verify/${orderId}?status=failed`);
    } catch (error) {
        res.redirect(`zhopingo://payment-verify/${orderId}?status=failed`);
    }
};