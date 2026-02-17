const axios = require("axios");
const Order = require("../models/Order");
const User = require("../models/User");
const Payment = require("../models/Payment");

// 🔑 Delhivery Credentials
const DELHI_TOKEN = "9b44fee45422e3fe8073dee9cfe7d51f9fff7629";
const DELHI_URL_CREATE = "https://track.delhivery.com/api/cmu/create.json";
const DELHI_URL_TRACK = "https://track.delhivery.com/api/v1/packages/json/";

/* =====================================================
    HELPER: Delhivery Shipment Trigger
===================================================== */
const triggerDelhiveryShipment = async (orderId) => {
    try {
        const order = await Order.findById(orderId);
        const user = await User.findById(order.customerId);
        
        if (!order) return null;

        const payload = {
            "shipments": [{
                "name": order.shippingAddress.receiverName || user.name || "Customer",
                "add": `${order.shippingAddress.flatNo}, ${order.shippingAddress.area}`,
                "pin": order.shippingAddress.pincode,
                "phone": user.phone || "0000000000",
                "order": order._id.toString(),
                "payment_mode": order.paymentMethod === 'COD' ? 'Collect' : 'Prepaid',
                "amount": order.totalAmount,
            }],
            "pickup_location": { "name": "ZHOPINGO_PRIMARY_HUB" } 
        };

        const response = await axios.post(DELHI_URL_CREATE, payload, {
            headers: {
                'Authorization': `Token ${DELHI_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        // ✅ Success aana AWB (Waybill) number kidaikum
        if (response.data?.packages?.[0]) {
            const awb = response.data.packages[0].waybill;
            order.awbNumber = awb;
            await order.save();
            return awb;
        }
        return null;
    } catch (error) {
        console.error("❌ Delhivery API Error:", error.response?.data || error.message);
        return null;
    }
};

/* =====================================================
    1. DUMMY SESSION (App flow break aagama iruka)
===================================================== */
exports.createSession = async (req, res) => {
  // Mobile app-la session ID keta, oru dummy ID anupuvom
  res.json({ 
    success: true, 
    paymentSessionId: "bypass_mode_" + Date.now() 
  });
};

/* =====================================================
    2. 🎯 VERIFY & SHIP (The Current Main Logic)
===================================================== */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1️⃣ Database-la order-a "Confirmed" status-ku mathuvom
    const order = await Order.findByIdAndUpdate(orderId, { 
      status: "Placed", 
      paymentStatus: "Paid" 
    }, { new: true });

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // 2️⃣ 🚀 Delhivery server-ku shipment request anupuvom
    const awb = await triggerDelhiveryShipment(orderId);

    // 3️⃣ Frontend-ku success response
    res.json({ 
      success: true, 
      status: "Paid", 
      message: "Order bypass success & Delhivery shipment triggered",
      awb: awb || "AWB Generation Pending" 
    });
  } catch (err) {
    console.error("❌ Verify Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
    3. REAL-TIME TRACKING (Delhivery direct connection)
===================================================== */
exports.trackOrder = async (req, res) => {
    try {
        const { awb } = req.params;
        if (!awb || awb === "null") return res.status(400).json({ success: false, message: "Invalid AWB" });

        const response = await axios.get(`${DELHI_URL_TRACK}?waybill=${awb}`, {
            headers: { 'Authorization': `Token ${DELHI_TOKEN}` }
        });

        res.json({ 
            success: true, 
            trackingData: response.data 
        });
    } catch (err) {
        console.error("❌ Tracking API Error:", err.message);
        res.status(500).json({ success: false, message: "Tracking fetch failed" });
    }
};

/* =====================================================
    4. DUMMY HANDLERS (Errors thavirkka)
===================================================== */
exports.cashfreeReturn = (req, res) => res.redirect("zhopingo://order-success");
exports.webhook = (req, res) => res.status(200).send("OK");