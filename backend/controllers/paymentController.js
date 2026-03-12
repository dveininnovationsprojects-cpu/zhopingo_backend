

// const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = require("pg-sdk-node");
// const Order = require("../models/Order");
// const User = require("../models/User");
// const axios = require("axios");


// const client = StandardCheckoutClient.getInstance(
//   process.env.PHONEPE_CLIENT_ID,
//   process.env.PHONEPE_CLIENT_SECRET,
//   parseInt(process.env.PHONEPE_CLIENT_VERSION),
//   process.env.PHONEPE_ENV === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX
// );


// const createDelhiveryShipment = async (order, customerPhone) => {
//   try {
   
//     const itemHSN = order.items?.[0]?.hsnCode || order.items?.[0]?.hsn || "0000";

//     const shipmentData = {
//       shipments: [{
//         name: order.shippingAddress?.receiverName || "Customer",
        
//         add: `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || order.shippingAddress?.area || "Testing Street"}`,
//         pin: order.shippingAddress?.pincode,
//         phone: customerPhone,
//         order: order._id.toString(),
//         payment_mode: "Pre-paid",
//         amount: order.totalAmount,
//         weight: 0.5,
//         hsn_code: itemHSN, 
//       }],
//       pickup_location: { name: "benjamin" }, 
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


// const updateOrderSuccess = async (orderId) => {
//   try {
//     const order = await Order.findById(orderId);
//     if (!order) return false;

//     if (order.paymentStatus !== "Paid") {
//       const user = await User.findById(order.customerId);
      
//       order.paymentStatus = "Paid";
//       order.status = "Placed";

      
//       const delhiRes = await createDelhiveryShipment(order, user?.phone || "9876543210");
      
//       if (delhiRes && (delhiRes.success === true || delhiRes.packages?.length > 0)) {
//     order.awbNumber = delhiRes.packages[0].waybill;
//     console.log("✅ Delhivery AWB Created:", order.awbNumber);
// } else {
    
//     order.awbNumber = "128374922"; 
//     console.log("⚠️ Delhivery Server Issue. Using fallback AWB for testing.");
// }

//       await order.save();
//       return true;
//     }
//     return true;
//   } catch (err) {
//     console.error("❌ updateOrderSuccess Error:", err.message);
//     return false;
//   }
// };


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


// exports.phonepeReturn = async (req, res) => {
//   try {
//     const { orderId } = req.params;

  
//     await updateOrderSuccess(orderId); 

//     const deepLink = `zhopingo://payment-verify/${orderId}`;

//     res.send(`
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <title>Payment Successful</title>
//         </head>
//         <body style="text-align:center; padding-top:50px; font-family:sans-serif;">
//           <h2 style="color: #0c831f;">Payment Successful!</h2>
//           <p>Redirecting you back to the Zhopingo app...</p>
//           <a href="${deepLink}" id="redirectBtn" style="background:#0c831f; color:#fff; padding:15px 30px; text-decoration:none; border-radius:10px; font-weight:bold;">Return to App</a>
//           <script>
//             window.location.href = "${deepLink}";
//             setTimeout(function() { document.getElementById('redirectBtn').click(); }, 1500);
//           </script>
//         </body>
//       </html>
//     `);
//   } catch (error) {
//     console.error("Error in phonepeReturn:", error);
//     res.status(500).send("Internal Server Error");
//   }
// };

// /* =====================================================
//     4️⃣ WEBHOOK & 5️⃣ TRACKING
// ===================================================== */
// exports.webhook = async (req, res) => {
//   try {
//     const response = req.body;
//     const orderId = response.merchantOrderId || response.data?.merchantOrderId;
//     const status = response.state || response.data?.state;
//     if (status === "COMPLETED") await updateOrderSuccess(orderId);
//     res.status(200).send("OK");
//   } catch (error) { res.status(500).send("Error"); }
// };

// // paymentController.js - trackOrder பங்க்ஷனுக்குள்:
// exports.trackOrder = async (req, res) => {
//   try {
//     const { awb } = req.params;

//     // 🌟 🌟 🌟 இந்த மேஜிக் இங்கயும் வேணும் மச்சான் 🌟 🌟 🌟
//     if (awb === "128374922") {
//         return res.json({
//             success: true,
//             tracking: {
//                 ShipmentData: [{
//                     Shipment: {
//                         Status: { Status: "In Transit", StatusDateTime: new Date().toISOString() },
//                         Scans: [{ ScanDetail: { Instructions: "Out for Delivery", ScannedLocation: "Chennai Hub" } }]
//                     }
//                 }]
//             }
//         });
//     }

//     const DELHI_TRACK_URL = process.env.DELHIVERY_ENV === "PRODUCTION"
//       ? "https://track.delhivery.com/api/v1/packages/json/"
//       : "https://staging-express.delhivery.com/api/v1/packages/json/";

//     const response = await axios.get(`${DELHI_TRACK_URL}?waybill=${awb}`, {
//       headers: { Authorization: `Token ${process.env.DELHIVERY_TOKEN}` },
//     });
//     res.json({ success: true, tracking: response.data });
//   } catch (error) {
//     res.status(500).json({ success: false, error: "Tracking failed" });
//   }
// };

const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = require("pg-sdk-node");
const Order = require("../models/Order");
const User = require("../models/User");
const axios = require("axios");

// 🔑 PHONEPE SDK INITIALIZATION
const client = StandardCheckoutClient.getInstance(
  process.env.PHONEPE_CLIENT_ID,
  process.env.PHONEPE_CLIENT_SECRET,
  parseInt(process.env.PHONEPE_CLIENT_VERSION),
  process.env.PHONEPE_ENV === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX
);

/* =====================================================
    🚚 DELHIVERY SHIPMENT HELPER (Real-World Standard)
===================================================== */
const createDelhiveryShipment = async (order, customerPhone, pickupName, weight) => {
  try {
    const itemHSN = order.items?.[0]?.hsnCode || "0000";

    const shipmentData = {
      shipments: [{
        name: order.shippingAddress?.receiverName || "Customer",
        add: `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || order.shippingAddress?.area || ""}`,
        pin: order.shippingAddress?.pincode,
        phone: customerPhone,
        order: order._id.toString(),
        payment_mode: "Pre-paid",
        amount: order.totalAmount,
        weight: weight || 0.5, // 🌟 Dynamic weight from Order logic
        hsn_code: itemHSN,
      }],
      pickup_location: { name: pickupName }, // 🌟 Dynamic pickup from Seller login
    };

    const DELHI_URL = process.env.DELHIVERY_ENV === "PRODUCTION" 
      ? "https://track.delhivery.com/api/cmu/create.json" 
      : "https://staging-express.delhivery.com/api/cmu/create.json";

    const response = await axios.post(
      DELHI_URL,
      `format=json&data=${JSON.stringify(shipmentData)}`,
      {
        headers: {
          Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Delhivery API Error:", error.response?.data || error.message);
    return null;
  }
};

const updateOrderSuccess = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order || order.paymentStatus === "Paid") return true;

    const user = await User.findById(order.customerId);
    order.paymentStatus = "Paid";
    order.status = "Placed";

    // 🌟 THE TRIGGER: Payment confirm aana aprom dhaan Shipment create aaganum
    const firstSeller = order.sellerSplitData[0];
    const pickupName = firstSeller?.shopName || "benjamin";
    const weight = firstSeller?.totalWeightKg || 0.5;

    const delhiRes = await createDelhiveryShipment(order, user?.phone || "9876543210", pickupName, weight);

    if (delhiRes && (delhiRes.success === true || delhiRes.packages?.length > 0)) {
        order.awbNumber = delhiRes.packages[0].waybill;
        console.log("✅ Blinkit Sync: AWB Generated", order.awbNumber);
    } else {
        order.awbNumber = "128374922"; // Staging fallback
    }

    await order.save();
    return true;
  } catch (err) {
    console.error("❌ updateOrderSuccess Error:", err.message);
    return false;
  }
};
/* =====================================================
    💳 PHONEPE SESSION & CALLBACKS
===================================================== */

exports.createSession = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(order._id.toString())
      .amount(Math.round(order.totalAmount * 100))
      .redirectUrl(`https://api.zhopingo.in/api/v1/payments/phonepe-return/${orderId}`)
      .build();

    const response = await client.pay(request);
    const checkoutUrl = response.redirect_url || response.redirectUrl || response.data?.instrumentResponse?.redirectInfo?.url;

    res.json({ success: true, url: checkoutUrl, phonepeOrderId: response.order_id || response.orderId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const response = await client.getOrderStatus(orderId);

    if (response.state === "COMPLETED") {
      await updateOrderSuccess(orderId);
      return res.json({ success: true });
    }
    res.status(400).json({ success: false, state: response.state });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// exports.phonepeReturn = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     await updateOrderSuccess(orderId); 

//     const deepLink = `zhopingo://payment-verify/${orderId}`;

//     res.send(`
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <title>Zhopingo Payment</title>
//         </head>
//         <body style="text-align:center; padding-top:50px; font-family:sans-serif;">
//           <h2 style="color: #0c831f;">Payment Successful!</h2>
//           <p>Redirecting you back to the app...</p>
//           <a href="${deepLink}" id="redirectBtn" style="background:#0c831f; color:#fff; padding:15px 30px; text-decoration:none; border-radius:10px; font-weight:bold;">Return to App</a>
//           <script>
//             window.location.href = "${deepLink}";
//             setTimeout(function() { document.getElementById('redirectBtn').click(); }, 1500);
//           </script>
//         </body>
//       </html>
//     `);
//   } catch (error) {
//     res.status(500).send("Internal Server Error");
//   }
// };


exports.phonepeReturn = async (req, res) => {
  try {
    const { orderId } = req.params;

    // 📡 PhonePe status check panroam
    const response = await client.getOrderStatus(orderId);

    if (response.state === "COMPLETED") {
        await updateOrderSuccess(orderId); // Status -> Placed, Payment -> Paid
        const deepLink = `zhopingo://payment-verify/${orderId}?status=success`;
        return res.redirect(deepLink); // 🌟 Direct redirect to App Success
    } else {
        // Payment fail aana status-ah thirumba 'Pending' or 'Failed' nu mathanum
        const deepLink = `zhopingo://payment-verify/${orderId}?status=failed`;
        return res.redirect(deepLink); // 🌟 Direct redirect to App Failure
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

exports.webhook = async (req, res) => {
  try {
    const response = req.body;
    const orderId = response.merchantOrderId || response.data?.merchantOrderId;
    const status = response.state || response.data?.state;
    if (status === "COMPLETED") await updateOrderSuccess(orderId);
    res.status(200).send("OK");
  } catch (error) { 
    res.status(500).send("Error"); 
  }
};