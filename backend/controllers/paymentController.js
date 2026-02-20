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
  process.env.PHONEPE_ENV === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX
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
   1️⃣ CREATE SESSION (URL-ஐக் கண்டுபிடிப்பதற்கான Final Code)
===================================================== */
exports.createSession = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // 🌟 டாக்குமெண்ட் படி Builder Pattern
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(order._id.toString())
      .amount(Math.round(order.totalAmount * 100))
      .redirectUrl(`${process.env.BASE_URL}/api/v1/payments/phonepe-return/${orderId}`)
      .build();

    const response = await client.pay(request);

    // 🔍 Debugging: உன் கன்சோலில் செக் பண்ணு என்ன டேட்டா வருதுன்னு
    console.log("FULL SDK RESPONSE:", JSON.stringify(response, null, 2));

    // 🛑 SDK வெர்ஷன் பொறுத்து URL இந்த 3 இடங்களில் ஏதோ ஒன்றில் இருக்கும்
    const checkoutUrl = response.redirect_url || 
                        response.redirectUrl || 
                        (response.data && response.data.instrumentResponse && response.data.instrumentResponse.redirectInfo.url);

    // ஆர்டர் ஐடியையும் அதேபோல் எடுக்கிறோம்
    const phonepeOrderId = response.order_id || response.orderId;

    if (phonepeOrderId) {
        order.paymentId = phonepeOrderId;
        await order.save();
    }

    // 🚀 இப்போ Postman-ல் செக் பண்ணு, URL கண்டிப்பாக வரும்!
    res.json({
      success: true,
      url: checkoutUrl, 
      phonepeOrderId: phonepeOrderId,
      state: response.state || "PENDING"
    });

  } catch (error) {
    console.error("❌ CREATE SESSION ERROR:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/* =====================================================
   2️⃣ VERIFY PAYMENT (Status Check)
===================================================== */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const response = await client.getOrderStatus(order._id.toString());

    if (response.state === "COMPLETED") {
      if (order.paymentStatus !== "Paid") {
        const user = await User.findById(order.customerId);
        order.paymentStatus = "Paid";
        order.status = "Placed";

        // 🚚 Delhivery Shipment Auto-Creation
        const delhiRes = await createDelhiveryShipment(order, user?.phone || "9876543210");
        if (delhiRes?.packages?.length > 0) {
          order.awbNumber = delhiRes.packages[0].waybill;
        }
        await order.save();
      }
      return res.json({ success: true, message: "Payment Verified Successfully", data: order });
    }

    res.status(400).json({ success: false, message: "Payment Failed or Pending", state: response.state });

  } catch (error) {
    console.error("❌ VERIFY ERROR:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/* =====================================================
   3️⃣ CALLBACK HANDLERS
===================================================== */
exports.phonepeReturn = (req, res) => {
  // மொபைல் ஆப்பில் ரீடைரக்ட் செய்ய Deep Linking
  res.redirect(`zhopingo://payment-verify/${req.params.orderId}`);
};

exports.webhook = (req, res) => {
  console.log("📩 Webhook Received:", req.body);
  res.status(200).send("OK");
};

exports.trackOrder = async (req, res) => {
  try {
    const response = await axios.get(`https://staging-express.delhivery.com/api/v1/packages/json/?waybill=${req.params.awb}`, {
      headers: { Authorization: `Token ${process.env.DELHIVERY_TOKEN}` },
    });
    res.json({ success: true, tracking: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: "Tracking failed" });
  }
};