// // // const axios = require('axios');
// // // const Payment = require('../models/Payment');
// // // const Order = require('../models/Order');
// // // const User = require('../models/User');

// // // const CF_APP_ID = process.env.CF_APP_ID;
// // // const CF_SECRET = process.env.CF_SECRET;
// // // const CF_URL = process.env.CF_URL;

// // // exports.createSession = async (req, res) => {
// // //     try {
// // //         const { orderId, amount, customerId, customerPhone, customerName, paymentMethod } = req.body;
// // //         const finalAmount = Number(amount);

      
// // //         if (paymentMethod === 'WALLET') {
// // //             const user = await User.findById(customerId);
// // //             if (!user || user.walletBalance < finalAmount) {
// // //                 return res.status(400).json({ success: false, error: "Insufficient Wallet Balance" });
// // //             }

// // //             user.walletBalance -= finalAmount;
// // //             user.walletTransactions.unshift({
// // //                 amount: finalAmount,
// // //                 type: 'DEBIT',
// // //                 reason: `Paid for Order #${orderId}`,
// // //                 date: new Date()
// // //             });
// // //             await user.save();

           
// // //             await Order.findByIdAndUpdate(orderId, { status: 'Placed' });
// // //             await Payment.create({ orderId, transactionId: `WAL-${Date.now()}`, amount: finalAmount, status: 'Success' });

// // //             return res.json({ success: true, message: "Wallet Payment Success" });
// // //         }

       
// // //         const cfOrderId = `ORD_${orderId}_${Date.now()}`; // தனித்துவமான ஐடி
// // //         const serverURL = "http://54.157.210.26"; 
// // //         const returnURL = `${serverURL}/api/v1/payments/verify?order_id={order_id}&internal_id=${orderId}`;

// // //         const response = await axios.post(CF_URL, {
// // //             order_id: cfOrderId,
// // //             order_amount: finalAmount,
// // //             order_currency: "INR",
// // //             customer_details: {
// // //                 customer_id: customerId.toString(),
// // //                 customer_phone: customerPhone,
// // //                 customer_name: customerName || "Zhopingo User"
// // //             },
// // //             order_meta: { return_url: returnURL }
// // //         }, {
// // //             headers: {
// // //                 "x-client-id": CF_APP_ID,
// // //                 "x-client-secret": CF_SECRET,
// // //                 "x-api-version": "2023-08-01"
// // //             }
// // //         });

// // //         res.json({ success: true, payment_url: response.data.payment_link });

// // //     } catch (err) {
// // //         res.status(500).json({ success: false, error: "Payment Gateway Error" });
// // //     }
// // // };

// // // // 🌟 3. VERIFY PAYMENT (இறுதித் திருத்தம்)
// // // exports.verifyPayment = async (req, res) => {
// // //     try {
// // //         const { order_id, internal_id } = req.query; // URL-ல் இருந்து எடுக்கும்

// // //         const response = await axios.get(`${CF_URL}/${order_id}`, {
// // //             headers: { "x-client-id": CF_APP_ID, "x-client-secret": CF_SECRET, "x-api-version": "2023-08-01" }
// // //         });

// // //         if (response.data.order_status === "PAID") {
// // //             // ஆர்டரை Placed ஆக மாற்றுதல்
// // //             await Order.findByIdAndUpdate(internal_id, { status: 'Placed' });
            
// // //             res.send(`<html><body style="text-align:center; padding-top:50px;">
// // //                 <h1 style="color:green;">Payment Successful! ✅</h1>
// // //                 <script>setTimeout(() => { window.location.href = "zhopingo://payment-success"; }, 2000);</script>
// // //             </body></html>`);
// // //         } else {
// // //             res.status(400).send("Payment Failed");
// // //         }
// // //     } catch (err) {
// // //         res.status(500).send("Verification Error");
// // //     }
// // // };


// // const axios = require('axios');
// // const Payment = require('../models/Payment');
// // const Order = require('../models/Order');
// // const User = require('../models/User');

// // const CF_APP_ID = process.env.CF_APP_ID;
// // const CF_SECRET = process.env.CF_SECRET;
// // const CF_URL = process.env.CF_URL;

// // exports.createSession = async (req, res) => {
// //   try {
// //     const {
// //       orderId,
// //       amount,
// //       customerId,
// //       customerPhone,
// //       customerName,
// //       paymentMethod
// //     } = req.body;

// //     const finalAmount = Number(amount);

// //     /* ---------- WALLET PAYMENT ---------- */
// //     if (paymentMethod === 'WALLET') {
// //       const user = await User.findById(customerId);

// //       if (!user || user.walletBalance < finalAmount) {
// //         return res.status(400).json({
// //           success: false,
// //           error: "Insufficient Wallet Balance"
// //         });
// //       }

// //       user.walletBalance -= finalAmount;
// //       user.walletTransactions.unshift({
// //         amount: finalAmount,
// //         type: 'DEBIT',
// //         reason: `Paid for Order #${orderId}`,
// //         date: new Date()
// //       });
// //       await user.save();

// //       await Order.findByIdAndUpdate(orderId, { status: 'Placed' });

// //       await Payment.create({
// //         orderId,
// //         transactionId: `WAL-${Date.now()}`,
// //         amount: finalAmount,
// //         status: 'Success'
// //       });

// //       return res.json({ success: true });
// //     }

// //     /* ---------- ONLINE PAYMENT (CASHFREE) ---------- */
// //     if (!CF_URL || !CF_APP_ID || !CF_SECRET) {
// //       return res.status(500).json({
// //         success: false,
// //         error: "Payment gateway not configured"
// //       });
// //     }

// //     const cfOrderId = `ORD_${orderId}_${Date.now()}`;
// //     const serverURL = "http://54.157.210.26";

// //     const returnURL =
// //       `${serverURL}/api/v1/payments/verify?order_id={order_id}&internal_id=${orderId}`;

// //     const response = await axios.post(
// //       CF_URL,
// //       {
// //         order_id: cfOrderId,
// //         order_amount: finalAmount,
// //         order_currency: "INR",
// //         customer_details: {
// //           customer_id: customerId.toString(),
// //           customer_phone: customerPhone,
// //           customer_name: customerName || "Zhopingo User"
// //         },
// //         order_meta: { return_url: returnURL }
// //       },
// //       {
// //         headers: {
// //           "x-client-id": CF_APP_ID,
// //           "x-client-secret": CF_SECRET,
// //           "x-api-version": "2023-08-01"
// //         }
// //       }
// //     );

// //     if (!response?.data?.payment_link) {
// //       return res.status(500).json({
// //         success: false,
// //         error: "Failed to create payment link"
// //       });
// //     }

// //     res.json({
// //       success: true,
// //       payment_url: response.data.payment_link
// //     });

// //   } catch (err) {
// //     console.error("PAYMENT ERROR:", err.message);
// //     res.status(500).json({
// //       success: false,
// //       error: "Payment Gateway Error"
// //     });
// //   }
// // };

// // /* ---------- VERIFY PAYMENT ---------- */
// // exports.verifyPayment = async (req, res) => {
// //   try {
// //     const { order_id, internal_id } = req.query;

// //     const response = await axios.get(`${CF_URL}/${order_id}`, {
// //       headers: {
// //         "x-client-id": CF_APP_ID,
// //         "x-client-secret": CF_SECRET,
// //         "x-api-version": "2023-08-01"
// //       }
// //     });

// //     if (response.data.order_status === "PAID") {
// //       await Order.findByIdAndUpdate(internal_id, { status: 'Placed' });

// //       return res.send(`
// //         <html>
// //           <body style="text-align:center;padding-top:50px;">
// //             <h1 style="color:green;">Payment Successful ✅</h1>
// //             <script>
// //               setTimeout(() => {
// //                 window.location.href = "zhopingo://payment-success";
// //               }, 2000);
// //             </script>
// //           </body>
// //         </html>
// //       `);
// //     }

// //     res.status(400).send("Payment Failed");

// //   } catch (err) {
// //     res.status(500).send("Verification Error");
// //   }
// // };

// // exports.getPaymentStatus = async (req, res) => {
// //   const order = await Order.findById(req.params.orderId);

// //   if (!order) {
// //     return res.status(404).json({ success: false });
// //   }

// //   res.json({
// //     success: true,
// //     status: order.status
// //   });
// // };const axios = require("axios");

// // const axios = require("axios");
// // const Order = require("../models/Order");
// // const Payment = require("../models/Payment");

// // const CF_APP_ID = process.env.CF_APP_ID;
// // const CF_SECRET = process.env.CF_SECRET;
// // const CF_BASE_URL = "https://sandbox.cashfree.com/pg";

// // exports.createSession = async (req, res) => {
// //   try {
// //     const {
// //       orderId,
// //       amount,
// //       customerId,
// //       customerPhone,
// //       customerName,
// //       paymentMethod
// //     } = req.body;

// //     const finalAmount = Math.round(Number(amount));

// //     /* ---------- WALLET ---------- */
// //     if (paymentMethod === "WALLET") {
// //       const user = await User.findById(customerId);

// //       if (!user || user.walletBalance < finalAmount) {
// //         return res.status(400).json({
// //           success: false,
// //           message: "Insufficient wallet balance"
// //         });
// //       }

// //       user.walletBalance -= finalAmount;
// //       await user.save();

// //       await Order.findByIdAndUpdate(orderId, { status: "Placed" });

// //       await Payment.create({
// //         orderId,
// //         amount: finalAmount,
// //         method: "WALLET",
// //         status: "SUCCESS"
// //       });

// //       return res.json({ success: true });
// //     }

// //     /* ---------- ONLINE (CASHFREE) ---------- */

// //     // 🔥 FIXED VALUES
// //     const cfOrderId = `CF${Date.now()}`; // < 32 chars
// //     const cleanPhone = customerPhone.replace(/\D/g, "").slice(-10);

// //     const response = await axios.post(
// //   `${CF_BASE_URL}/orders`,
// //   {
// //     order_id: cfOrderId,
// //     order_amount: finalAmount,
// //     order_currency: "INR",
// //     customer_details: {
// //       customer_id: customerId,
// //       customer_phone: cleanPhone,
// //       customer_name: customerName || "Customer"
// //     }
// //   },
// //   {
// //     headers: {
// //       "x-client-id": CF_APP_ID,
// //       "x-client-secret": CF_SECRET,
// //       "x-api-version": "2023-08-01",
// //       "Content-Type": "application/json"
// //     }
// //   }
// // );


// //     return res.json({
// //       success: true,
// //       payment_url: response.data.payment_link,
// //       cfOrderId
// //     });

// //   } catch (err) {
// //     console.error("PAYMENT ERROR:", err.response?.data || err.message);
// //     res.status(500).json({
// //       success: false,
// //       error: err.response?.data || err.message
// //     });
// //   }
// // };

// // exports.checkPaymentStatus = async (req, res) => {
// //   try {
// //     const payment = await Payment.findOne({ orderId: req.params.orderId });
// //     if (!payment) return res.json({ success: false });

// //     const response = await axios.get(
// //       `${CF_BASE_URL}/orders/${payment.cfOrderId}`,
// //       {
// //         headers: {
// //           "x-client-id": CF_APP_ID,
// //           "x-client-secret": CF_SECRET,
// //           "x-api-version": "2023-08-01"
// //         }
// //       }
// //     );

// //     if (response.data.order_status === "PAID") {
// //       payment.status = "SUCCESS";
// //       await payment.save();

// //       await Order.findByIdAndUpdate(payment.orderId, { status: "Placed" });

// //       return res.json({ success: true, status: "Placed" });
// //     }

// //     return res.json({ success: true, status: "Pending" });

// //   } catch (err) {
// //     res.status(500).json({ success: false });
// //   }
// // };


// // const axios = require("axios");
// // const Order = require("../models/Order");
// // const Payment = require("../models/Payment");
// // const User = require("../models/User");

// // const CF_BASE_URL = "https://sandbox.cashfree.com/pg";
// // const CF_APP_ID = process.env.CF_APP_ID;
// // const CF_SECRET = process.env.CF_SECRET;

// // exports.createSession = async (req, res) => {
// //   try {
// //     const {
// //       orderId,
// //       amount,
// //       customerId,
// //       customerPhone,
// //       customerName,
// //       paymentMethod
// //     } = req.body;

// //     const finalAmount = Math.round(Number(amount));

// //     // 🔹 WALLET
// //     if (paymentMethod === "WALLET") {
// //       const user = await User.findById(customerId);
// //       if (!user || user.walletBalance < finalAmount)
// //         return res.status(400).json({ success: false });

// //       user.walletBalance -= finalAmount;
// //       await user.save();

// //       await Order.findByIdAndUpdate(orderId, { status: "Placed" });

// //       await Payment.create({
// //         orderId,
// //         amount: finalAmount,
// //         method: "WALLET",
// //         status: "SUCCESS"
// //       });

// //       return res.json({ success: true });
// //     }

// //     // 🔹 ONLINE (CASHFREE)
// //     const cfOrderId = `CF${Date.now()}`;
// //     const cleanPhone = customerPhone.replace(/\D/g, "").slice(-10);

// //     await axios.post(
// //       `${CF_BASE_URL}/orders`,
// //       {
// //         order_id: cfOrderId,
// //         order_amount: finalAmount,
// //         order_currency: "INR",
// //         customer_details: {
// //           customer_id: customerId,
// //           customer_phone: cleanPhone,
// //           customer_name: customerName || "Customer"
// //         }
// //       },
// //       {
// //         headers: {
// //           "x-client-id": CF_APP_ID,
// //           "x-client-secret": CF_SECRET,
// //           "x-api-version": "2023-08-01",
// //           "Content-Type": "application/json"
// //         }
// //       }
// //     );

// //     // 🔥 THIS WAS YOUR BIGGEST BUG (NOW FIXED)
// //     await Payment.create({
// //       orderId,
// //       cfOrderId,
// //       amount: finalAmount,
// //       method: "ONLINE",
// //       status: "PENDING"
// //     });

// //     res.json({ success: true, cfOrderId });
// //   } catch (err) {
// //     res.status(500).json({ success: false, error: err.message });
// //   }
// // };

// // exports.checkPaymentStatus = async (req, res) => {
// //   try {
// //     const payment = await Payment.findOne({ orderId: req.params.orderId });
// //     if (!payment) return res.json({ success: false });

// //     const response = await axios.get(
// //       `${CF_BASE_URL}/orders/${payment.cfOrderId}`,
// //       {
// //         headers: {
// //           "x-client-id": CF_APP_ID,
// //           "x-client-secret": CF_SECRET,
// //           "x-api-version": "2023-08-01"
// //         }
// //       }
// //     );

// //     if (response.data.order_status === "PAID") {
// //       payment.status = "SUCCESS";
// //       await payment.save();

// //       await Order.findByIdAndUpdate(payment.orderId, { status: "Placed" });

// //       return res.json({ success: true, status: "Placed" });
// //     }

// //     res.json({ success: true, status: "Pending" });
// //   } catch {
// //     res.status(500).json({ success: false });
// //   }
// // };


// const axios = require("axios");
// const Order = require("../models/Order");
// const Payment = require("../models/Payment");

// const CF_BASE_URL = "https://sandbox.cashfree.com/pg";
// const CF_APP_ID = process.env.CF_APP_ID;
// const CF_SECRET = process.env.CF_SECRET;

// /* =====================================================
//    CREATE CASHFREE PAYMENT SESSION
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
//       status: "PENDING",
//       rawResponse: response.data
//     });

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
// exports.verifyPayment = async (req, res) => {
//   try {
//     const { orderId } = req.params; 

//     // 🌟 1. முதலில் Database ID அல்லது Transaction ID எதில் இருந்தாலும் தேடு
//     const payment = await Payment.findOne({ 
//       $or: [{ orderId: orderId }, { transactionId: orderId }] 
//     });

//     if (!payment) {
//       // ரெக்கார்டு இல்லையென்றால் ஆர்டர் ஸ்டேட்டஸை மட்டும் செக் பண்ணு
//       const order = await Order.findById(orderId);
//       return res.json({ 
//         success: true, 
//         status: order ? order.status : "Pending" 
//       });
//     }

//     // 🌟 2. Cashfree-ல் நிஜமான நிலையை அறிய transactionId-ஐப் பயன்படுத்து
//     const response = await axios.get(`${CF_BASE_URL}/orders/${payment.transactionId}`, {
//       headers: { "x-client-id": CF_APP_ID, "x-client-secret": CF_SECRET, "x-api-version": "2023-08-01" }
//     });

//     if (response.data.order_status === "PAID") {
//       payment.status = "SUCCESS";
//       await payment.save();

//       // 🌟 மிக முக்கியம்: ஆர்டரை 'Placed' என மாற்று
//       await Order.findByIdAndUpdate(payment.orderId, { status: "Placed" });

//       return res.json({ 
//         success: true, 
//         status: "Placed" // 🌟 இதைக் கண்டிப்பாக அனுப்ப வேண்டும்
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

const CF_BASE_URL = "https://sandbox.cashfree.com/pg";
const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;

/* =====================================================
   1. CREATE SESSION (With Auto-Success for Fast Testing)
===================================================== */
exports.createSession = async (req, res) => {
  try {
    const { orderId, amount, customerId, customerPhone, customerName } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const cfOrderId = `CF_${orderId}_${Date.now()}`;

    const response = await axios.post(
      `${CF_BASE_URL}/orders`,
      {
        order_id: cfOrderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: customerId,
          customer_phone: customerPhone,
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
      status: "SUCCESS", 
    });

  
    await Order.findByIdAndUpdate(orderId, { status: "Placed" });

    res.json({
      success: true,
      cfOrderId,
      paymentSessionId: response.data.payment_session_id
    });

  } catch (err) {
    console.error("CREATE SESSION ERROR:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
   2. VERIFY PAYMENT (Super Fast Polling Response)
===================================================== */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params; 

    // 1. Database-ல் தேடு
    const payment = await Payment.findOne({ 
      $or: [{ orderId: orderId }, { transactionId: orderId }] 
    });

    // 2. ஒருவேளை ஏற்கனவே Placed ஆகி இருந்தால் கேஷ்ஃப்ரீயைக் கேட்காமல் உடனே பதில் சொல்
    const order = await Order.findById(orderId);
    if (order && order.status === "Placed") {
        return res.json({ 
            success: true, 
            status: "Placed",
            message: "Order already confirmed"
        });
    }

   
    if (!payment) {
      return res.json({ success: true, status: "Pending" });
    }

    
    const response = await axios.get(`${CF_BASE_URL}/orders/${payment.transactionId}`, {
      headers: { 
          "x-client-id": CF_APP_ID, 
          "x-client-secret": CF_SECRET, 
          "x-api-version": "2023-08-01" 
      }
    });

    if (response.data.order_status === "PAID" || response.data.order_status === "ACTIVE") {
     
      await Order.findByIdAndUpdate(orderId, { status: "Placed" });
      payment.status = "SUCCESS";
      await payment.save();

      return res.json({ 
        success: true, 
        status: "Placed"
      });
    }

    res.json({ success: true, status: "Pending" });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};