




// const axios = require("axios");
// const Order = require("../models/Order");
// const Payment = require("../models/Payment");

// const CF_BASE_URL = "https://sandbox.cashfree.com/pg";
// const CF_APP_ID = process.env.CF_APP_ID;
// const CF_SECRET = process.env.CF_SECRET;

// /* =====================================================
//    1. CREATE SESSION (With Auto-Success for Fast Testing)
// ===================================================== */
// exports.createSession = async (req, res) => {
//   try {
//     const { orderId, amount, customerId, customerPhone, customerName } = req.body;

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }

//     const cfOrderId = `CF_${orderId}_${Date.now()}`;

//     const response = await axios.post(
//       `${CF_BASE_URL}/orders`,
//       {
//         order_id: cfOrderId,
//         order_amount: amount,
//         order_currency: "INR",
//         customer_details: {
//           customer_id: customerId,
//           customer_phone: customerPhone,
//           customer_name: customerName || "Customer"
//         }
//       },
//       {
//         headers: {
//           "x-client-id": CF_APP_ID,
//           "x-client-secret": CF_SECRET,
//           "x-api-version": "2023-08-01",
//           "Content-Type": "application/json"
//         }
//       }
//     );

  
//     await Payment.create({
//       orderId,
//       transactionId: cfOrderId,
//       amount,
//       status: "SUCCESS", 
//     });

  
//     await Order.findByIdAndUpdate(orderId, { status: "Placed" });

//     res.json({
//       success: true,
//       cfOrderId,
//       paymentSessionId: response.data.payment_session_id
//     });

//   } catch (err) {
//     console.error("CREATE SESSION ERROR:", err.response?.data || err.message);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// /* =====================================================
//    2. VERIFY PAYMENT (Super Fast Polling Response)
// ===================================================== */
// exports.verifyPayment = async (req, res) => {
//   try {
//     const { orderId } = req.params; 

//     // 1. Database-ல் தேடு
//     const payment = await Payment.findOne({ 
//       $or: [{ orderId: orderId }, { transactionId: orderId }] 
//     });

//     // 2. ஒருவேளை ஏற்கனவே Placed ஆகி இருந்தால் கேஷ்ஃப்ரீயைக் கேட்காமல் உடனே பதில் சொல்
//     const order = await Order.findById(orderId);
//     if (order && order.status === "Placed") {
//         return res.json({ 
//             success: true, 
//             status: "Placed",
//             message: "Order already confirmed"
//         });
//     }

   
//     if (!payment) {
//       return res.json({ success: true, status: "Pending" });
//     }

    
//     const response = await axios.get(`${CF_BASE_URL}/orders/${payment.transactionId}`, {
//       headers: { 
//           "x-client-id": CF_APP_ID, 
//           "x-client-secret": CF_SECRET, 
//           "x-api-version": "2023-08-01" 
//       }
//     });

//     if (response.data.order_status === "PAID" || response.data.order_status === "ACTIVE") {
     
//       await Order.findByIdAndUpdate(orderId, { status: "Placed" });
//       payment.status = "SUCCESS";
//       await payment.save();

//       return res.json({ 
//         success: true, 
//         status: "Placed"
//       });
//     }

//     res.json({ success: true, status: "Pending" });

//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };


const axios = require("axios");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const User = require("../models/User");

// 🌟 Cashfree Test/Sandbox URL
const CF_BASE_URL = "https://sandbox.cashfree.com/pg";
const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;

/* =====================================================
   1. CREATE SESSION
===================================================== */
exports.createSession = async (req, res) => {
  try {
    const { orderId, amount, customerId, customerPhone, customerName } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Cashfree விதிமுறைப்படி தனித்துவமான Order ID
    const cfOrderId = `CF_${orderId}_${Date.now()}`;

    const response = await axios.post(
      `${CF_BASE_URL}/orders`,
      {
        order_id: cfOrderId,
        order_amount: Math.round(amount), // காசுகளை முழு எண்ணாக மாற்றுதல்
        order_currency: "INR",
        customer_details: {
          customer_id: customerId.toString(),
          customer_phone: customerPhone.replace(/\D/g, "").slice(-10), // 10 இலக்க எண் மட்டும்
          customer_name: customerName || "Customer"
        }
      },
      {
        headers: {
          "x-client-id": CF_APP_ID,
          "x-client-secret": CF_SECRET,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json"
        }
      }
    );

    // 🌟 பணம் செலுத்தப்படுவதற்கு முன் 'PENDING' என்று சேமித்தல்
    await Payment.create({
      orderId,
      transactionId: cfOrderId,
      amount: Math.round(amount),
      status: "PENDING", 
    });

    res.json({
      success: true,
      cfOrderId,
      paymentSessionId: response.data.payment_session_id
    });

  } catch (err) {
    console.error("CREATE SESSION ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: "Payment Gateway Error" });
  }
};

/* =====================================================
   2. VERIFY PAYMENT (நிஜமான பேமெண்ட் செக்)
===================================================== */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params; 

    // ஆர்டர் ஏற்கனவே உறுதியாகிவிட்டதா?
    const order = await Order.findById(orderId);
    if (order && order.status === "Placed") {
        return res.json({ success: true, status: "Placed" });
    }

    // சமீபத்திய பேமெண்ட் விபரத்தை எடுத்தல்
    const payment = await Payment.findOne({ orderId: orderId }).sort({ createdAt: -1 });
    if (!payment) {
      return res.json({ success: true, status: "Pending" });
    }

    // Cashfree சர்வரில் பேமெண்ட் ஸ்டேட்டஸ் பார்த்தல்
    const response = await axios.get(`${CF_BASE_URL}/orders/${payment.transactionId}`, {
      headers: { 
          "x-client-id": CF_APP_ID, 
          "x-client-secret": CF_SECRET, 
          "x-api-version": "2023-08-01" 
      }
    });

    // 🌟 பயனர் நிஜமாகவே பணம் செலுத்தியிருந்தால் மட்டுமே 'Placed' என மாற்றவும்
    if (response.data.order_status === "PAID") {
      await Order.findByIdAndUpdate(orderId, { status: "Placed" });
      
      payment.status = "SUCCESS";
      await payment.save();

      return res.json({ success: true, status: "Placed" });
    }

    res.json({ success: true, status: "Pending" });

  } catch (err) {
    res.status(500).json({ success: false, error: "Verification failed" });
  }
};