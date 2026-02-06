




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

// 🌟 எவ்வித மாற்றமும் இல்லாத உங்களின் ஒரிஜினல் URL
const CF_APP_ID = process.env.CF_APP_ID;
const CF_SECRET = process.env.CF_SECRET;
const CF_URL = process.env.CF_URL; 

/* =====================================================
   1. CREATE SESSION (Direct Payment Link)
===================================================== */
exports.createSession = async (req, res) => {
    try {
        const { orderId, amount, customerId, customerPhone, customerName, paymentMethod } = req.body;
        const finalAmount = Number(amount);

        // 🔹 WALLET PAYMENT LOGIC
        if (paymentMethod === 'WALLET') {
            const user = await User.findById(customerId);
            if (!user || user.walletBalance < finalAmount) {
                return res.status(400).json({ success: false, error: "Insufficient Wallet Balance" });
            }

            user.walletBalance -= finalAmount;
            user.walletTransactions.unshift({
                amount: finalAmount,
                type: 'DEBIT',
                reason: `Paid for Order #${orderId}`,
                date: new Date()
            });
            await user.save();

            await Order.findByIdAndUpdate(orderId, { status: 'Placed' });
            await Payment.create({ orderId, transactionId: `WAL-${Date.now()}`, amount: finalAmount, status: 'Success' });

            return res.json({ success: true, message: "Wallet Payment Success" });
        }

        // 🔹 ONLINE PAYMENT (CASHFREE DIRECT LINK)
        const cfOrderId = `ORD_${orderId}_${Date.now()}`;
        const serverURL = `${req.protocol}://${req.get('host')}`; 
        const returnURL = `${serverURL}/api/v1/payments/verify?order_id={order_id}&internal_id=${orderId}`;

        const response = await axios.post(CF_URL, {
            order_id: cfOrderId,
            order_amount: finalAmount,
            order_currency: "INR",
            customer_details: {
                customer_id: customerId.toString(),
                customer_phone: customerPhone.replace(/\D/g, "").slice(-10),
                customer_name: customerName || "Zhopingo User"
            },
            order_meta: { return_url: returnURL }
        }, {
            headers: {
                "x-client-id": CF_APP_ID,
                "x-client-secret": CF_SECRET,
                "x-api-version": "2023-08-01"
            }
        });

        // 🌟 உங்கள் ஆப் எதிர்பார்ப்பது இந்த 'payment_link' தான்
        res.json({ 
            success: true, 
            payment_url: response.data.payment_link || response.data.order_pay_url 
        });

    } catch (err) {
        console.error("PAYMENT GATEWAY ERROR:", err.response?.data || err.message);
        res.status(500).json({ success: false, error: "Payment Gateway Error" });
    }
};

/* =====================================================
   2. VERIFY PAYMENT (Auto-Confirm)
===================================================== */
exports.verifyPayment = async (req, res) => {
    try {
        const { order_id, internal_id } = req.query;

        const response = await axios.get(`${CF_URL}/${order_id}`, {
            headers: { 
                "x-client-id": CF_APP_ID, 
                "x-client-secret": CF_SECRET, 
                "x-api-version": "2023-08-01" 
            }
        });

        if (response.data.order_status === "PAID") {
            // ஆர்டரை Placed ஆக மாற்றுதல்
            await Order.findByIdAndUpdate(internal_id, { status: 'Placed' });
            
            // பேமெண்ட் ரெக்கார்டு உருவாக்குதல்
            await Payment.create({
                orderId: internal_id,
                transactionId: order_id,
                amount: response.data.order_amount,
                status: 'Success'
            });

            res.send(`<html><body style="text-align:center; padding-top:50px; font-family:sans-serif;">
                <h1 style="color:#0c831f;">Payment Successful! ✅</h1>
                <p>Redirecting back to app...</p>
                <script>setTimeout(() => { window.location.href = "zhopingo://payment-success"; }, 2000);</script>
            </body></html>`);
        } else {
            res.status(400).send("Payment Failed or Pending ❌");
        }
    } catch (err) {
        res.status(500).send("Verification Error");
    }
};