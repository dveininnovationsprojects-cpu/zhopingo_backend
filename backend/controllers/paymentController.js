




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

// Hardcoding the URL here is safe and standard
const CF_BASE_URL = "https://sandbox.cashfree.com/pg";

// Ensure these are set in your .env file on the AWS server
const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;

exports.createSession = async (req, res) => {
  try {
    const { orderId, amount, customerId, customerPhone, customerName } = req.body;

    // 1. Validate Credentials exist
    if (!CF_APP_ID || !CF_SECRET) {
      return res.status(500).json({ success: false, message: "Payment credentials missing on server" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const cfOrderId = `CF_${orderId}_${Date.now()}`;

    // 2. Call Cashfree POST API (This cannot be done via browser)
    const response = await axios.post(
      `${CF_BASE_URL}/orders`,
      {
        order_id: cfOrderId,
        order_amount: Number(amount), // Ensure amount is a number
        order_currency: "INR",
        customer_details: {
          customer_id: String(customerId), // Ensure ID is a string
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

    // 3. Save Pending Payment to DB
    await Payment.create({
      orderId,
      transactionId: cfOrderId,
      amount,
      status: "PENDING", 
    });

    res.json({
      success: true,
      cfOrderId,
      paymentSessionId: response.data.payment_session_id // Give this to Mobile SDK
    });

  } catch (err) {
    // This logs the EXACT reason why Cashfree rejected the POST request
    console.error("CASHFREE API ERROR:", err.response?.data || err.message);
    res.status(500).json({ 
      success: false, 
      error: err.response?.data?.message || err.message 
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