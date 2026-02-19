const axios = require("axios");
const crypto = require("crypto");
const Order = require("../models/Order");
const User = require("../models/User");




const MERCHANT_ID = "M237ACUYGH2JB_2602171705";
const SALT_KEY = "c57a4b5e-0510-4a20-b517-fd2743ffc010";

const SALT_INDEX = 1;

const PHONEPE_BASE_URL =
  "https://api-preprod.phonepe.com/apis/pg-sandbox";



const DELHI_TOKEN = "9b44fee45422e3fe8073dee9cfe7d51f9fff7629";
const DELHI_URL_CREATE =
  "https://staging-express.delhivery.com/api/cmu/create.json";
const DELHI_URL_TRACK =
  "https://staging-express.delhivery.com/api/v1/packages/json/";



const createDelhiveryShipment = async (order, customerPhone) => {
  try {
    const shipmentData = {
      shipments: [
        {
          name: order.shippingAddress?.receiverName || "Customer",
          add: `${order.shippingAddress?.flatNo || ""}, ${
            order.shippingAddress?.addressLine || ""
          }`,
          pin: order.shippingAddress?.pincode,
          phone: customerPhone,
          order: order._id.toString(),
          payment_mode: "Pre-paid",
          amount: order.totalAmount,
          weight: 0.5,
          hsn_code: "6109",
        },
      ],
      pickup_location: { name: "benjamin" },
    };

    const finalData = `format=json&data=${JSON.stringify(shipmentData)}`;

    const response = await axios.post(DELHI_URL_CREATE, finalData, {
      headers: {
        Authorization: `Token ${DELHI_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data;
  } catch (error) {
    console.error(
     
      error.response?.data || error.message
    );
    return null;
  }
};


exports.createSession = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });

    const transactionId = `TXN_${Date.now()}`;
    order.paymentId = transactionId;
    await order.save();

    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: order.customerId.toString(),
      amount: Math.round(order.totalAmount * 100),
      redirectUrl: `https://api.zhopingo.in/api/v1/payments/phonepe-return/${orderId}`,
      redirectMode: "POST",
      callbackUrl: `https://api.zhopingo.in/api/v1/payments/webhook`,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const base64Payload = Buffer.from(
      JSON.stringify(payload)
    ).toString("base64");


    const checksum =
      crypto
        .createHash("sha256")
        .update(base64Payload + "/pg/v1/pay" + SALT_KEY)
        .digest("hex") +
      "###" +
      SALT_INDEX;

    const response = await axios.post(
      `${PHONEPE_BASE_URL}/pg/v1/pay`,
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
      }
    );

    return res.json({
      success: true,
      url: response.data.data.instrumentResponse.redirectInfo.url,
    });

  } catch (error) {
    console.error(
      " CREATE SESSION ERROR:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};


exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });

    const statusPath = `/pg/v1/status/${MERCHANT_ID}/${order.paymentId}`;

    const checksum =
      crypto
        .createHash("sha256")
        .update(statusPath + SALT_KEY)
        .digest("hex") +
      "###" +
      SALT_INDEX;

    const response = await axios.get(
      `${PHONEPE_BASE_URL}${statusPath}`,
      {
        headers: {
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": MERCHANT_ID,
        },
      }
    );

    if (
      response.data.success &&
      response.data.code === "PAYMENT_SUCCESS"
    ) {
      const user = await User.findById(order.customerId);

      order.paymentStatus = "Paid";
      order.status = "Placed";

      const delhiRes = await createDelhiveryShipment(
        order,
        user?.phone || "9876543210"
      );

      if (delhiRes?.packages?.length > 0) {
        order.awbNumber = delhiRes.packages[0].waybill;
      }

      await order.save();

      return res.json({
        success: true,
        message: "Payment Successful & Shipment Created",
        data: order,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Payment incomplete",
    });

  } catch (error) {
    console.error(
      " VERIFY ERROR:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};


exports.trackOrder = async (req, res) => {
  try {
    const { awb } = req.params;

    const response = await axios.get(
      `${DELHI_URL_TRACK}?waybill=${awb}`,
      {
        headers: {
          Authorization: `Token ${DELHI_TOKEN}`,
        },
      }
    );

    res.json({
      success: true,
      tracking: response.data,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Tracking failed",
    });
  }
};

exports.phonepeReturn = async (req, res) => {
  const { orderId } = req.params;
  res.redirect(`zhopingo://payment-verify/${orderId}`);
};



exports.webhook = async (req, res) => {
  console.log(" PhonePe Webhook:", req.body);
  res.status(200).send("OK");
};
