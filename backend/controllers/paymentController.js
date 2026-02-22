// const {
//   StandardCheckoutClient,
//   Env,
//   StandardCheckoutPayRequest
// } = require("pg-sdk-node");

// const Order = require("../models/Order");
// const User = require("../models/User");
// const axios = require("axios");

// /* =====================================================
//    🔑 SDK INITIALIZATION
// ===================================================== */
// const client = StandardCheckoutClient.getInstance(
//   process.env.PHONEPE_CLIENT_ID,
//   process.env.PHONEPE_CLIENT_SECRET,
//   parseInt(process.env.PHONEPE_CLIENT_VERSION),
//   process.env.PHONEPE_ENV === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX
// );

// /* =====================================================
//    🚚 DELHIVERY HELPER
// ===================================================== */
// const createDelhiveryShipment = async (order, customerPhone) => {
//   try {
//     const shipmentData = {
//       shipments: [{
//         name: order.shippingAddress?.receiverName || "Customer",
//         add: `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || ""}`,
//         pin: order.shippingAddress?.pincode,
//         phone: customerPhone,
//         order: order._id.toString(),
//         payment_mode: "Pre-paid",
//         amount: order.totalAmount,
//         weight: 0.5,
//         hsn_code: "6109",
//       }],
//       pickup_location: { name: "benjamin" },
//     };

//     const response = await axios.post(
//       "https://staging-express.delhivery.com/api/cmu/create.json",
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
//     console.error("❌ Delhivery Error:", error.message);
//     return null;
//   }
// };

// /* =====================================================
//    1️⃣ CREATE SESSION (URL-ஐக் கண்டுபிடிப்பதற்கான Final Code)
// ===================================================== */
// exports.createSession = async (req, res) => {
//   try {
//     const { orderId } = req.body;
//     const order = await Order.findById(orderId);
//     if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//     // 🌟 டாக்குமெண்ட் படி Builder Pattern
//     const request = StandardCheckoutPayRequest.builder()
//       .merchantOrderId(order._id.toString())
//       .amount(Math.round(order.totalAmount * 100))
//       .redirectUrl(`${process.env.BASE_URL}/api/v1/payments/phonepe-return/${orderId}`)
//       .build();

//     const response = await client.pay(request);

//     // 🔍 Debugging: உன் கன்சோலில் செக் பண்ணு என்ன டேட்டா வருதுன்னு
//     console.log("FULL SDK RESPONSE:", JSON.stringify(response, null, 2));

//     // 🛑 SDK வெர்ஷன் பொறுத்து URL இந்த 3 இடங்களில் ஏதோ ஒன்றில் இருக்கும்
//     const checkoutUrl = response.redirect_url || 
//                         response.redirectUrl || 
//                         (response.data && response.data.instrumentResponse && response.data.instrumentResponse.redirectInfo.url);

//     // ஆர்டர் ஐடியையும் அதேபோல் எடுக்கிறோம்
//     const phonepeOrderId = response.order_id || response.orderId;

//     if (phonepeOrderId) {
//         order.paymentId = phonepeOrderId;
//         await order.save();
//     }

//     // 🚀 இப்போ Postman-ல் செக் பண்ணு, URL கண்டிப்பாக வரும்!
//     res.json({
//       success: true,
//       url: checkoutUrl, 
//       phonepeOrderId: phonepeOrderId,
//       state: response.state || "PENDING"
//     });

//   } catch (error) {
//     console.error("❌ CREATE SESSION ERROR:", error.message);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// /* =====================================================
//    2️⃣ VERIFY PAYMENT (Status Check)
// ===================================================== */
// exports.verifyPayment = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const order = await Order.findById(orderId);
//     if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//     const response = await client.getOrderStatus(order._id.toString());

//     if (response.state === "COMPLETED") {
//       if (order.paymentStatus !== "Paid") {
//         const user = await User.findById(order.customerId);
//         order.paymentStatus = "Paid";
//         order.status = "Placed";

//         // 🚚 Delhivery Shipment Auto-Creation
//         const delhiRes = await createDelhiveryShipment(order, user?.phone || "9876543210");
//         if (delhiRes?.packages?.length > 0) {
//           order.awbNumber = delhiRes.packages[0].waybill;
//         }
//         await order.save();
//       }
//       return res.json({ success: true, message: "Payment Verified Successfully", data: order });
//     }

//     res.status(400).json({ success: false, message: "Payment Failed or Pending", state: response.state });

//   } catch (error) {
//     console.error("❌ VERIFY ERROR:", error.message);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// /* =====================================================
//    3️⃣ CALLBACK HANDLERS
// ===================================================== */
// exports.phonepeReturn = (req, res) => {
//   const { orderId } = req.params;
//   const deepLink = `zhopingo://payment-verify/${orderId}`;

//   // 🌟 இந்த HTML பேஜ் பிரவுசரை மூடிவிட்டு உன் ஆப்பை மட்டும் திறக்கும்
//   res.send(`
//     <!DOCTYPE html>
//     <html>
//       <head>
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Zhopingo Payment</title>
//         <style>
//           body { font-family: sans-serif; text-align: center; padding: 50px 20px; background: #fff; }
//           .status { color: #0c831f; font-size: 20px; font-weight: bold; }
//           .btn { background: #0c831f; color: #fff; padding: 12px 25px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 20px; }
//         </style>
//       </head>
//       <body>
//         <div class="status">Payment Processed Successfully!</div>
//         <p>Redirecting back to Zhopingo app...</p>
//         <a href="${deepLink}" class="btn">Click if not redirected</a>

//         <script>
//           // 🚀 ஆப்பைத் திறக்க முயற்சிக்கும்
//           window.location.href = "${deepLink}";

//           // 🚀 2 செகண்ட் கழித்து பிரவுசரை மூடும் (ஆப் ஏற்கனவே ஓபன் ஆகியிருக்கும்)
//           setTimeout(function() {
//             window.close();
//           }, 2000);
//         </script>
//       </body>
//     </html>
//   `);
// };

// exports.webhook = (req, res) => {
//   console.log("📩 Webhook Received:", req.body);
//   res.status(200).send("OK");
// };

// exports.trackOrder = async (req, res) => {
//   try {
//     const response = await axios.get(`https://staging-express.delhivery.com/api/v1/packages/json/?waybill=${req.params.awb}`, {
//       headers: { Authorization: `Token ${process.env.DELHIVERY_TOKEN}` },
//     });
//     res.json({ success: true, tracking: response.data });
//   } catch (error) {
//     res.status(500).json({ success: false, error: "Tracking failed" });
//   }
// };

const {
  StandardCheckoutClient,
  Env,
  StandardCheckoutPayRequest
} = require("pg-sdk-node");

const Order = require("../models/Order");
const User = require("../models/User");
const axios = require("axios");

/* =====================================================
   🔑 SDK INITIALIZATION
===================================================== */
const client = StandardCheckoutClient.getInstance(
  process.env.PHONEPE_CLIENT_ID,
  process.env.PHONEPE_CLIENT_SECRET,
  parseInt(process.env.PHONEPE_CLIENT_VERSION),
  process.env.PHONEPE_ENV === "PRODUCTION"
    ? Env.PRODUCTION
    : Env.SANDBOX
);

/* =====================================================
   🚚 DELHIVERY HELPER
===================================================== */
const createDelhiveryShipment = async (order, customerPhone) => {
  try {
    const shipmentData = {
      shipments: [{
        name: order.shippingAddress?.receiverName || "Customer",
        add: `${order.shippingAddress?.flatNo || ""}, ${order.shippingAddress?.addressLine || ""}`,
        pin: order.shippingAddress?.pincode,
        phone: customerPhone,
        order: order._id.toString(),
        payment_mode: "Pre-paid",
        amount: order.totalAmount,
        weight: 0.5,
        hsn_code: "6109",
      }],
      pickup_location: { name: "benjamin" },
    };

    const response = await axios.post(
      "https://staging-express.delhivery.com/api/cmu/create.json",
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
    console.error("❌ Delhivery Error:", error.message);
    return null;
  }
};

/* =====================================================
   1️⃣ CREATE SESSION
===================================================== */
exports.createSession = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(order._id.toString())
      .amount(Math.round(order.totalAmount * 100))
      .redirectUrl(
        `https://api.zhopingo.in/api/v1/payments/phonepe-return/${orderId}`
      )
      .build();

    const response = await client.pay(request);

    const checkoutUrl =
      response.redirect_url ||
      response.redirectUrl ||
      response.data?.instrumentResponse?.redirectInfo?.url;

    return res.json({
      success: true,
      url: checkoutUrl,
      phonepeOrderId: response.order_id || response.orderId
    });

  } catch (error) {
    console.error("❌ CREATE SESSION ERROR:", error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/* =====================================================
   2️⃣ UPDATE ORDER SUCCESS
===================================================== */
const updateOrderSuccess = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) return false;

    if (order.paymentStatus === "Paid") return true;

    const user = await User.findById(order.customerId);

    order.paymentStatus = "Paid";
    order.status = "Placed";

    const delhiRes = await createDelhiveryShipment(
      order,
      user?.phone || "9876543210"
    );

    if (delhiRes?.packages?.length > 0) {
      order.awbNumber = delhiRes.packages[0].waybill;
      console.log("✅ AWB Linked:", order.awbNumber);
    }

    await order.save();
    return true;

  } catch (err) {
    console.error("❌ updateOrderSuccess Error:", err.message);
    return false;
  }
};

/* =====================================================
   3️⃣ VERIFY PAYMENT API
===================================================== */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const response = await client.getOrderStatus(orderId);

    if (response.state === "COMPLETED") {
      await updateOrderSuccess(orderId);
      return res.json({ success: true });
    }

    res.status(400).json({
      success: false,
      state: response.state
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.phonepeReturn = (req, res) => {
  const { orderId } = req.params;
  const deepLink = `zhopingo://payment-verify/${orderId}`;

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Returning to Zhopingo</title>
      </head>
      <body style="text-align:center; padding-top:100px; font-family:sans-serif;">
        <h2>Payment Successful!</h2>
        <p>Redirecting you back to the app...</p>
        
        <a href="${deepLink}" id="redirectBtn" style="background:#0c831f; color:#fff; padding:15px 30px; text-decoration:none; border-radius:10px; font-weight:bold;">Return to App</a>

        <script>
          // 🚀 ஆட்டோமேட்டிக்கா ஆப்பைத் திறக்க முயற்சிக்கும்
          window.location.href = "${deepLink}";
          
          // ஒருவேளை ஆப் திறக்கலைனா, யூசர் பட்டனை அழுத்தலாம்
          setTimeout(function() {
            document.getElementById('redirectBtn').click();
          }, 1000);
        </script>
      </body>
    </html>
  `);
};

/* =====================================================
   5️⃣ WEBHOOK
===================================================== */
exports.webhook = async (req, res) => {
  try {
    const response = req.body;

    const orderId =
      response.merchantOrderId ||
      response.data?.merchantOrderId;

    const status =
      response.state ||
      response.data?.state;

    if (status === "COMPLETED") {
      await updateOrderSuccess(orderId);
      console.log(`✅ Webhook Confirmed: ${orderId}`);
    }

    res.status(200).send("OK");

  } catch (error) {
    console.error("❌ Webhook Error:", error.message);
    res.status(500).send("Error");
  }
};

/* =====================================================
   6️⃣ TRACKING
===================================================== */
exports.trackOrder = async (req, res) => {
  try {
    const response = await axios.get(
      `https://staging-express.delhivery.com/api/v1/packages/json/?waybill=${req.params.awb}`,
      {
        headers: {
          Authorization: `Token ${process.env.DELHIVERY_TOKEN}`,
        },
      }
    );

    res.json({
      success: true,
      tracking: response.data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Tracking failed"
    });
  }
};