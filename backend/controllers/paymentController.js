




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

// ✅ Standard Sandbox URL
const CF_BASE_URL = "https://sandbox.cashfree.com/pg";

// ⚠️ Check your AWS .env file for these!
const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;

exports.createSession = async (req, res) => {
  try {
    const { orderId, amount, customerId, customerPhone, customerName } = req.body;

    if (!CF_APP_ID || !CF_SECRET) {
      return res.status(500).json({ success: false, message: "Payment credentials missing on AWS server" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const cfOrderId = `CF_${orderId}_${Date.now()}`;

    // 🚀 Sending the POST request (This is what the browser CANNOT do)
    const response = await axios.post(
      `${CF_BASE_URL}/orders`,
      {
        order_id: cfOrderId,
        order_amount: Number(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: String(customerId),
          customer_phone: String(customerPhone),
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

    await Payment.create({
      orderId,
      transactionId: cfOrderId,
      amount,
      status: "PENDING", 
    });

    // 🎯 Send this sessionId to your Mobile App
    res.json({
      success: true,
      cfOrderId,
      paymentSessionId: response.data.payment_session_id 
    });

  } catch (err) {
    // 🔍 THIS LOGS THE REAL REASON IN YOUR TERMINAL
    console.error("CASHFREE API ERROR DETAILS:", err.response?.data || err.message);
    res.status(500).json({ 
      success: false, 
      error: err.response?.data?.message || "Check server logs for details" 
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params; 

    const payment = await Payment.findOne({ 
      $or: [{ orderId: orderId }, { transactionId: orderId }] 
    });

    if (!payment) return res.json({ success: true, status: "Pending" });

    const response = await axios.get(`${CF_BASE_URL}/orders/${payment.transactionId}`, {
      headers: { 
          "x-client-id": CF_APP_ID, 
          "x-client-secret": CF_SECRET, 
          "x-api-version": "2023-08-01" 
      }
    });

    if (response.data.order_status === "PAID") {
      await Order.findByIdAndUpdate(orderId, { status: "Placed" });
      payment.status = "SUCCESS";
      await payment.save();

      return res.json({ success: true, status: "Placed" });
    }

    res.json({ success: true, status: "Pending" });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};