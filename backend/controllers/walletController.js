

// const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = require("pg-sdk-node");
// const Order = require("../models/Order");
// const User = require("../models/User");
// const Seller = require("../models/Seller");
// const axios = require("axios");

// // 🌟 THE SYNC: Logistics Controller-la irundhu master function-ah direct-ah edukkurom
// const { processShipmentCreation } = require("./logisticsController"); 

// // 🛠️ ENVIRONMENT TOGGLE
// const IS_PROD = process.env.NODE_ENV === "production";

// /* =====================================================
//     🔑 PHONEPE SDK INITIALIZATION (Global Singleton Fix)
//     Prevents "Cannot re-initialize" error across multiple controllers
// ===================================================== */
// const getPhonePeClient = () => {
//     if (!global.phonePeClientInstance) {
//         try {
//             global.phonePeClientInstance = StandardCheckoutClient.getInstance(
//                 process.env.PHONEPE_CLIENT_ID,
//                 process.env.PHONEPE_CLIENT_SECRET,
//                 parseInt(process.env.PHONEPE_CLIENT_VERSION) || 1,
//                 IS_PROD ? Env.PRODUCTION : Env.SANDBOX
//             );
//         } catch (error) {
//             console.error("Wallet PhonePe Init Error:", error.message);
//         }
//     }
//     return global.phonePeClientInstance;
// };

// // ✅ 1. CREATE WALLET TOPUP SESSION (Using PhonePe)
// exports.createWalletTopupSession = async (req, res) => {
//   try {
//     const client = getPhonePeClient(); // 👈 Safe Initialization Call
//     const { userId, amount } = req.body;
//     // Wallet topup-kku dummy ID create pannuvom
//     const topupId = `WLT_${userId}_${Date.now()}`;

//     const request = StandardCheckoutPayRequest.builder()
//       .merchantOrderId(topupId)
//       .amount(Math.round(amount * 100))
//       .redirectUrl(`https://api.zhopingo.in/api/v1/wallet/verify-topup/${topupId}`)
//       .build();

//     const response = await client.pay(request);
//     const checkoutUrl = response.redirect_url || response.redirectUrl || response.data?.instrumentResponse?.redirectInfo?.url;

//     res.json({ success: true, url: checkoutUrl, phonepeOrderId: response.order_id || response.orderId });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// // ✅ 2. VERIFY WALLET TOPUP
// exports.verifyWalletTopup = async (req, res) => {
//   try {
//     const client = getPhonePeClient(); // 👈 Safe Initialization Call
//     const { topupId } = req.params; 
//     const response = await client.getOrderStatus(topupId);

//     if (response.state === "COMPLETED") {
//       const parts = topupId.split('_');
//       const userId = parts[1];
//       const amount = response.amount / 100;

//       const user = await User.findById(userId);
//       const alreadyAdded = user.walletTransactions.some(t => t.reason.includes(topupId));

//       if (!alreadyAdded) {
//         user.walletBalance += amount;
//         user.walletTransactions.unshift({
//           amount,
//           type: "CREDIT",
//           reason: `Wallet Topup Success (${topupId})`,
//           date: new Date()
//         });
//         await user.save();
//       }
      
//       return res.redirect(`zhopingo://wallet-success?amount=${amount}`);
//     }
//     res.redirect("zhopingo://wallet-failed");
//   } catch (err) {
//     res.redirect("zhopingo://wallet-failed");
//   }
// };

// // ✅ 3. PAY USING WALLET (With Direct Logistics Sync)
// exports.payUsingWallet = async (req, res) => {
//   try {
//     const { orderId, userId } = req.body;
//     const user = await User.findById(userId);
//     const order = await Order.findById(orderId);

//     if (!user || !order) return res.status(404).json({ success: false, message: "Not found" });
//     if (user.walletBalance < order.totalAmount) return res.status(400).json({ success: false, message: "Insufficient balance" });

//     // 1. Debit Wallet
//     user.walletBalance -= order.totalAmount;
//     user.walletTransactions.unshift({
//       amount: order.totalAmount,
//       type: "DEBIT",
//       reason: `Order Payment (#${order._id.toString().slice(-6).toUpperCase()})`,
//       date: new Date()
//     });

//     // 2. Update Order Status (Industry Standard)
//     order.paymentStatus = "Paid";
//     order.status = "Placed";
//     order.paymentMethod = "Wallet";

//     // 3. 🚚 Trigger Delhivery Shipment via Centralized Logistics Logic
//     let isAWBGenerated = false;

//     for (let split of order.sellerSplitData) {
//         const sellerDoc = await Seller.findById(split.sellerId);
        
//         if (sellerDoc) {
//             if (IS_PROD) {
//                 // 🌟 DIRECT CALL TO LOGISTICS CONTROLLER
//                 const shipmentResult = await processShipmentCreation(order._id, sellerDoc._id, sellerDoc.shopName);
//                 if (shipmentResult && shipmentResult.success) isAWBGenerated = true;
//             } else {
//                 // SANDBOX FALLBACK: Testing purposes only
//                 const fallbackAWB = "128374922";
//                 split.awbNumber = fallbackAWB;
//                 split.packageStatus = "Placed";
                
//                 order.items.forEach(item => {
//                     if (item.sellerId.toString() === split.sellerId.toString()) {
//                         item.itemAwbNumber = fallbackAWB;
//                         item.itemStatus = "Placed";
//                     }
//                 });
//                 isAWBGenerated = true;
//             }
//         }
//     }

//     // 4. Atomic Save
//     await user.save();
//     await order.save();

//     res.json({ 
//       success: true, 
//       message: "Payment Successful & Shipment Triggered!", 
//       newBalance: user.walletBalance,
//       awbStatus: isAWBGenerated ? "Generated" : "Pending Sync"
//     });

//   } catch (err) {
//     console.error("Wallet Payment Error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// // ✅ 4. GET STATUS
// exports.getWalletStatus = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.userId).select("walletBalance walletTransactions");
//     res.json({ success: true, balance: user?.walletBalance || 0, transactions: user?.walletTransactions || [] });
//   } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };

// // ✅ 5. ADMIN ADJUSTMENT
// exports.adminUpdateWallet = async (req, res) => {
//   try {
//     const { userId, amount, reason } = req.body;
//     const user = await User.findById(userId);
//     user.walletBalance += Number(amount);
//     user.walletTransactions.unshift({
//       amount: Math.abs(Number(amount)),
//       type: Number(amount) >= 0 ? "CREDIT" : "DEBIT",
//       reason: reason || "Admin Adjustment",
//       date: new Date()
//     });
//     await user.save();
//     res.json({ success: true, balance: user.walletBalance });
//   } catch (err) { res.status(500).json({ success: false, error: err.message }); }
// };


const { StandardCheckoutClient, Env, StandardCheckoutPayRequest } = require("pg-sdk-node");
const Order = require("../models/Order");
const User = require("../models/User");
const Seller = require("../models/Seller");
const axios = require("axios");
const mongoose = require("mongoose");

// 🌟 THE SYNC: Logistics Controller-la irundhu master function-ah direct-ah edukkurom
const { processShipmentCreation } = require("./logisticsController"); 

// 🛠️ ENVIRONMENT TOGGLE
const IS_PROD = process.env.NODE_ENV === "production";

/* =====================================================
    🔑 PHONEPE SDK INITIALIZATION (Global Singleton Fix)
    Prevents "Cannot re-initialize" error across multiple controllers
===================================================== */
const getPhonePeClient = () => {
    if (!global.phonePeClientInstance) {
        try {
            global.phonePeClientInstance = StandardCheckoutClient.getInstance(
                process.env.PHONEPE_CLIENT_ID,
                process.env.PHONEPE_CLIENT_SECRET,
                parseInt(process.env.PHONEPE_CLIENT_VERSION) || 1,
                Env.SANDBOX // 👈 Fixed to Sandbox as per your requirement
            );
        } catch (error) {
            console.error("Wallet PhonePe Init Error:", error.message);
        }
    }
    return global.phonePeClientInstance;
};

// ✅ 1. CREATE WALLET TOPUP SESSION (Using PhonePe)
exports.createWalletTopupSession = async (req, res) => {
  try {
    const client = getPhonePeClient(); // 👈 Safe Initialization Call
    const { userId, amount } = req.body;
    // Wallet topup-kku dummy ID create pannuvom
    const topupId = `WLT_${userId}_${Date.now()}`;

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(topupId)
      .amount(Math.round(amount * 100))
      .redirectUrl(`https://api.zhopingo.in/api/v1/wallet/verify-topup/${topupId}`)
      .build();

    const response = await client.pay(request);
    const checkoutUrl = response.redirect_url || response.redirectUrl || response.data?.instrumentResponse?.redirectInfo?.url;

    res.json({ success: true, url: checkoutUrl, phonepeOrderId: response.order_id || response.orderId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ 2. VERIFY WALLET TOPUP
exports.verifyWalletTopup = async (req, res) => {
  try {
    const client = getPhonePeClient(); // 👈 Safe Initialization Call
    const { topupId } = req.params; 
    const response = await client.getOrderStatus(topupId);

    if (response.state === "COMPLETED") {
      const parts = topupId.split('_');
      const userId = parts[1];
      const amount = response.amount / 100;

      const user = await User.findById(userId);
      const alreadyAdded = user.walletTransactions.some(t => t.reason.includes(topupId));

      if (!alreadyAdded) {
        user.walletBalance += amount;
        user.walletTransactions.unshift({
          amount,
          type: "CREDIT",
          reason: `Wallet Topup Success (${topupId})`,
          date: new Date()
        });
        await user.save();
      }
      
      return res.redirect(`zhopingo://wallet-success?amount=${amount}`);
    }
    res.redirect("zhopingo://wallet-failed");
  } catch (err) {
    res.redirect("zhopingo://wallet-failed");
  }
};
exports.payUsingWallet = async (req, res) => {
  try {
    const { orderId, userId } = req.body;

    // 🛡️ ObjectId Conversion (To fix Cast to ObjectId error)
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({ success: false, error: "Invalid Order ID format" });
    }

    const user = await User.findById(userId);
    const order = await Order.findById(orderId);

    if (!user || !order) return res.status(404).json({ success: false, message: "Not found" });
    if (order.paymentStatus === "Paid") return res.status(400).json({ success: false, message: "Already Paid" });
    if (user.walletBalance < order.totalAmount) return res.status(400).json({ success: false, message: "Insufficient balance" });

    // 1. 💰 DEBIT WALLET
    user.walletBalance -= order.totalAmount;
    user.walletTransactions.unshift({
      amount: order.totalAmount,
      type: "DEBIT",
      reason: `Order Payment (#${order._id.toString().slice(-6).toUpperCase()})`,
      date: new Date()
    });

    // 2. 📝 INITIAL STATUS UPDATE
    order.paymentStatus = "Paid";
    order.status = "Placed"; 
    order.paymentMethod = "Wallet";

    await user.save();
    await order.save();

    console.log(`📡 Triggering Delhivery AWB for Order ${order._id}`);
    let isAWBGenerated = false;

    // 3. 🚚 THE PERSISTENCE LOOP (Direct DB Injection)
    for (let split of order.sellerSplitData) {
        const shipmentResult = await processShipmentCreation(order._id, split.sellerId);
        
        if (shipmentResult && shipmentResult.success && shipmentResult.awb) {
            console.log(`✅ AWB Success: ${shipmentResult.awb}`);
            isAWBGenerated = true;

            // 🌟 THE MASTER FIX: Use direct UpdateOne to bypass memory reference issues
            await Order.updateOne(
                { _id: order._id, "sellerSplitData.sellerId": split.sellerId },
                { 
                    $set: { 
                        "sellerSplitData.$.awbNumber": shipmentResult.awb,
                        "sellerSplitData.$.packageStatus": "Packed" 
                    } 
                }
            );

            // Item level tracker sync (Used for frontend summary)
            await Order.updateOne(
                { _id: order._id },
                { 
                    $set: { 
                        "items.$[elem].itemAwbNumber": shipmentResult.awb,
                        "items.$[elem].itemStatus": "Packed"
                    } 
                },
                { 
                    arrayFilters: [{ "elem.sellerId": split.sellerId }] 
                }
            );
        }
    }

    // Response-ku munnadi DB fetch pannanum, appo dhaan Postman-la value varum
    const finalOrder = await Order.findById(orderId);

    res.json({ 
      success: true, 
      message: "Payment Successful & AWB Stored!", 
      newBalance: user.walletBalance,
      awbStatus: isAWBGenerated ? "Generated & Registered" : "Pending API",
      order: finalOrder // Ippo summary JSON-la AWB katchithama varum
    });

  } catch (err) {
    console.error("CRITICAL WALLET ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
// ✅ 4. GET STATUS
exports.getWalletStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("walletBalance walletTransactions");
    res.json({ success: true, balance: user?.walletBalance || 0, transactions: user?.walletTransactions || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ✅ 5. ADMIN ADJUSTMENT
exports.adminUpdateWallet = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    const user = await User.findById(userId);
    user.walletBalance += Number(amount);
    user.walletTransactions.unshift({
      amount: Math.abs(Number(amount)),
      type: Number(amount) >= 0 ? "CREDIT" : "DEBIT",
      reason: reason || "Admin Adjustment",
      date: new Date()
    });
    await user.save();
    res.json({ success: true, balance: user.walletBalance });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};