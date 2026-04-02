

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

// 🌟 Import Master Logistics Function
const { processShipmentCreation } = require("./logisticsController"); 

// 🛠️ ENVIRONMENT TOGGLE
const IS_PROD = process.env.PHONEPE_ENV === "PRODUCTION";

/* =====================================================
    🔑 PHONEPE SDK INITIALIZATION (SINGLETON)
===================================================== */
const phonePeClient = StandardCheckoutClient.getInstance(
    process.env.PHONEPE_CLIENT_ID,
    process.env.PHONEPE_CLIENT_SECRET,
    parseInt(process.env.PHONEPE_CLIENT_VERSION) || 1,
    IS_PROD ? Env.PRODUCTION : Env.SANDBOX
);

// Export for wallet
exports.phonePeClient = phonePeClient;
/* =====================================================
    🌟 MASTER SYNC: updateOrderSuccess (PhonePe + AWB Fix)
===================================================== */
const updateOrderSuccess = async (orderId) => {
    try {
        const order = await Order.findById(orderId);
        if (!order || order.paymentStatus === "Paid") return true;

        // 1. Initial Status Flip
        order.paymentStatus = "Paid";
        order.status = "Placed";
        order.paymentMethod = "Online"; // PhonePe logic sync
        await order.save(); 

        console.log(`📡 PhonePe Success: Syncing Master Logistics for Order ${orderId}`);

        if (order.sellerSplitData && order.sellerSplitData.length > 0) {
            for (let split of order.sellerSplitData) {
                
                /* =====================================================
                   🌟 THE ABSOLUTE SYNC (PhonePe Edition):
                   Inga vera endha manual name-um (Navi) anuppa koodadhu.
                   Strictly unga 'processShipmentCreation' master call.
                   Adhu dhaan 'Navib5eb' format-ah Delhivery Dashboard-ku anuppum.
                ===================================================== */
                const shipmentResult = await processShipmentCreation(order._id, split.sellerId);
                
                if (shipmentResult && shipmentResult.success && shipmentResult.awb) {
                    console.log(`✅ PhonePe AWB Stored: ${shipmentResult.awb}`);

                    // 🌟 PERSISTENCE: Seller Array Update
                    await Order.updateOne(
                        { _id: order._id, "sellerSplitData.sellerId": split.sellerId },
                        { 
                            $set: { 
                                "sellerSplitData.$.awbNumber": shipmentResult.awb,
                                "sellerSplitData.$.packageStatus": "Packed" 
                            } 
                        }
                    );

                    // 🌟 PERSISTENCE: Item Tracking Sync
                    await Order.updateOne(
                        { _id: order._id },
                        { 
                            $set: { 
                                "items.$[elem].itemAwbNumber": shipmentResult.awb,
                                "items.$[elem].itemStatus": "Packed"
                            } 
                        },
                        { arrayFilters: [{ "elem.sellerId": split.sellerId }] }
                    );
                } else {
                    console.error(`❌ PhonePe Logistics Fail [${split.sellerId}]: ${shipmentResult?.message}`);
                    
                    // Fallback logic for production resilience (Blinkit Standard)
                    if (!IS_PROD) {
                        const fallbackAWB = "4716" + Math.floor(Math.random() * 10000000);
                        await Order.updateOne(
                            { _id: order._id, "sellerSplitData.sellerId": split.sellerId },
                            { $set: { "sellerSplitData.$.awbNumber": fallbackAWB, "sellerSplitData.$.packageStatus": "Packed" } }
                        );
                    }
                }
            }
        }
        return true;
    } catch (err) {
        console.error("❌ updateOrderSuccess Error:", err.message);
        return false;
    }
};
/* =====================================================
    💳 PHONEPE SESSION (The Critical Fix for OrderId)
===================================================== */
exports.createSession = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const request = StandardCheckoutPayRequest.builder()
            .merchantOrderId(order._id.toString())
            .amount(Math.round(order.totalAmount * 100))
            .redirectUrl(`${process.env.BASE_URL}/api/v1/payments/phonepe-return/${orderId}`)
            .build();

        const response = await phonePeClient.pay(request);
        
        // 🌟 URL EXTRACTION
        const checkoutUrl = response.redirect_url || 
                            response.redirectUrl || 
                            (response.data && response.data.instrumentResponse && response.data.instrumentResponse.redirectInfo && response.data.instrumentResponse.redirectInfo.url);

        // 🌟 ID EXTRACTION: Katchithama intha key kulla dhaan idhu irukkum
        const phonepeOrderIdResult = response.order_id || 
                                     response.orderId || 
                                     (response.data && response.data.merchantOrderId) || 
                                     (response.data && response.data.orderId) ||
                                     order._id.toString(); // Fallback to DB ID

        if (!checkoutUrl) throw new Error("PhonePe failed to provide a checkout URL");

        res.json({ 
            success: true, 
            url: checkoutUrl, 
            phonepeOrderId: phonepeOrderIdResult // 👈 IPPO IDHU KANDIPPA VARUM!
        });

    } catch (error) {
        console.error("Create Session Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const response = await phonePeClient.getOrderStatus(orderId);

        if (response.state === "COMPLETED" || (response.data && response.data.state === "COMPLETED")) {
            await updateOrderSuccess(orderId);
            return res.json({ success: true });
        }
        res.status(400).json({ success: false, state: response.state || (response.data && response.data.state) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.phonepeReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const response = await phonePeClient.getOrderStatus(orderId);
        const state = response.state || (response.data && response.data.state);

        let statusFlag = "failed";
        if (state === "COMPLETED") {
            await updateOrderSuccess(orderId); // 🌟 FIRST STATUS UPDATE PANNIDUM
            statusFlag = "success";
        }

        // 🚀 THE BRIDGE HANDSHAKE: Automatic redirect with manual fallback button
        const deepLink = `zhopingo://payment-verify/${orderId}?status=${statusFlag}`;

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Redirecting to Zhopingo...</title>
            </head>
            <body style="text-align:center; padding-top:100px; font-family:sans-serif; background:#fff;">
                <h2 style="color:#0c831f;">Payment ${statusFlag === 'success' ? 'Successful' : 'Failed'}!</h2>
                <p>Please wait, redirecting you back to the app...</p>
                <br/>
                <a href="${deepLink}" id="manualRedirect" style="background:#0c831f; color:#fff; padding:15px 30px; text-decoration:none; border-radius:12px; font-weight:bold; font-size:16px;">
                   Click here if not redirected
                </a>
                <script>
                    window.location.href = "${deepLink}";
                    // Forced redirect fallback for chrome/safari
                    setTimeout(function() {
                        document.getElementById('manualRedirect').click();
                    }, 1000);
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        console.error("handshake error:", error.message);
        res.redirect(`zhopingo://payment-verify/${orderId}?status=failed`);
    }
};

exports.webhook = async (req, res) => {
    try {
        const response = req.body;
        const orderId = response.merchantOrderId || (response.data && response.data.merchantOrderId);
        const status = response.state || (response.data && response.data.state) || response.code;
        
        if (status === "COMPLETED" || status === "PAYMENT_SUCCESS") {
            await updateOrderSuccess(orderId);
        }
        res.status(200).send("OK");
    } catch (error) { 
        res.status(500).send("Error"); 
    }
};