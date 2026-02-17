const axios = require('axios');
const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');

// 🔑 PhonePe Config (உன் மெயில்ல வந்த டீடைல்ஸ இங்க மாத்து)
const MERCHANT_ID = "PGCHECKOUT"; // Sample ID, உன் ஒரிஜினல் ID-ஐ போடு
const SALT_KEY = "099db054-d86e-4474-88c6-2c2a45484701"; // உன் Salt Key
const SALT_INDEX = 1;
const PHONEPE_API_URL = "https://api-preprod.phonepe.com/api/pg-sandbox/pg/v1/pay";
const PHONEPE_STATUS_URL = "https://api-preprod.phonepe.com/api/pg-sandbox/pg/v1/status";

/* =====================================================
    1️⃣ CREATE SESSION (PhonePe Payment URL Generation)
===================================================== */
exports.createSession = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);

        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        const transactionId = `TXN_${Date.now()}`;
        order.paymentId = transactionId; // Order-ல ட்ரான்சாக்ஷன் ID சேமிக்கிறோம்
        await order.save();

        const data = {
            merchantId: MERCHANT_ID,
            merchantTransactionId: transactionId,
            merchantUserId: order.customerId.toString(),
            amount: order.totalAmount * 100, // PhonePe-க்கு பைசாவில் அனுப்ப வேண்டும்
            redirectUrl: `https://api.zhopingo.in/api/v1/payment/phonepe-return/${orderId}`,
            redirectMode: 'POST',
            callbackUrl: `https://api.zhopingo.in/api/v1/payment/webhook`,
            paymentInstrument: { type: 'PAY_PAGE' }
        };

        const payload = JSON.stringify(data);
        const payloadMain = Buffer.from(payload).toString('base64');
        const string = payloadMain + '/pg/v1/pay' + SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + '###' + SALT_INDEX;

        const options = {
            method: 'POST',
            url: PHONEPE_API_URL,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            data: { request: payloadMain }
        };

        const response = await axios.request(options);
        
        res.json({ 
            success: true, 
            url: response.data.data.instrumentResponse.redirectUrls[0],
            transactionId 
        });

    } catch (error) {
        console.error("PhonePe Create Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};

/* =====================================================
    2️⃣ VERIFY PAYMENT & AUTO-SHIP (Delhivery)
===================================================== */
exports.verifyPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        // 🛡️ PhonePe Status Check
        const string = `/pg/v1/status/${MERCHANT_ID}/${order.paymentId}` + SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + '###' + SALT_INDEX;

        const options = {
            method: 'GET',
            url: `${PHONEPE_STATUS_URL}/${MERCHANT_ID}/${order.paymentId}`,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': MERCHANT_ID
            }
        };

        const response = await axios.request(options);

        if (response.data.success === true && response.data.code === 'PAYMENT_SUCCESS') {
            order.paymentStatus = "Paid";
            order.status = "Placed";

            // 🚚 DELHI_CREATION: இங்க தான் டெல்லிவரி AWB ஜெனரேட் ஆகும் (ஏற்கனவே குடுத்த லாஜிக்)
            // ஒருவேளை இது ஆட்டோமேட்டிக்கா நடக்கணும்னா createDelhiveryShipment-ஐ இங்க கூப்பிடணும்.
            
            await order.save();
            return res.json({ success: true, message: "Payment Verified & Order Placed", data: order });
        } else {
            return res.status(400).json({ success: false, message: "Payment Failed or Pending" });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/* =====================================================
    3️⃣ PHONEPE RETURN (Redirection from Gateway)
==================================================== */
exports.phonepeReturn = async (req, res) => {
    const { orderId } = req.params;
    // பேமெண்ட் முடிஞ்சதும் கஸ்டமரை ஆப்புக்குத் திருப்பி விடுறோம்
    res.redirect(`zhopingo://payment-verify/${orderId}`);
};

/* =====================================================
    4️⃣ WEBHOOK & TRACKING (Dummy for logic)
===================================================== */
exports.webhook = async (req, res) => {
    console.log("PhonePe Webhook Received:", req.body);
    res.status(200).send("OK");
};

exports.trackOrder = async (req, res) => {
    // Delhivery tracking logic here
};