const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const Seller = require("../models/Seller");
const FinanceSettings = require("../models/FinanceSettings");

const mongoose = require("mongoose");

// 🌟 THE CRITICAL SYNC: Functions-ah katchithama import panrom
const {
  getRealTimeRateInternal,
  getWeightInKg,
  processShipmentCreation ,
  cancelShipmentInternal,
  createReversePickupInternal/// 👈 IDHU KANDIPPA IRUKKANUM!
} = require("./logisticsController");

// /* =====================================================
//     🌟 MASTER CREATE ORDER (Direct Payload Sync Fix + Stock Sync)
// ===================================================== */
// exports.createOrder = async (req, res) => {
//     try {
//         // 🌟 THE MASTER SYNC: Frontend payload-la irundhu values-ah direct-ah edukkuroam
//         const { items, customerId, shippingAddress, paymentMethod, deliveryCharge } = req.body;

//         const user = await User.findById(customerId);
//         if (!user) return res.status(404).json({ success: false, message: "User not found" });

//         const settings = await FinanceSettings.findOne() || {
//             commissionPercent: 10,
//             gstOnCommissionPercent: 18,
//             tdsPercent: 2
//         };

//         let totalItemTotal = 0;
//         let sellerWiseSplit = {};
//         const processedItems = [];

//         // Step 1: Process Items & Calculate Item Subtotal & UPDATE STOCK
//         for (const item of items) {
//             const productDoc = await Product.findById(item.productId || item._id);
//             const sellerDoc = await Seller.findById(productDoc?.seller || item.sellerId);
//             if (!productDoc || !sellerDoc) continue;

//             const qty = Number(item.quantity);

//             // 🛡️ STOCK CHECK: Quantity irukka nu check panroam
//             if (productDoc.stock < qty) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `Insufficient stock for ${productDoc.name}. Only ${productDoc.stock} left.`
//                 });
//             }

//             // 📉 STOCK REDUCTION: Atomic-ah minus panroam
//             productDoc.stock -= qty;

//             // 🛡️ AUTO-INACTIVE: Stock 0 aana udane product-ah inactive aakki buyers-ku hide panroam
//             if (productDoc.stock <= 0) {
//                 productDoc.stock = 0;
//                 productDoc.status = "inactive";
//             }
//             await productDoc.save();

//             const subtotal = Number(item.price) * qty;
//             totalItemTotal += subtotal;

//             const sIdStr = sellerDoc._id.toString();
//             if (!sellerWiseSplit[sIdStr]) {
//                 sellerWiseSplit[sIdStr] = {
//                     sellerId: sellerDoc._id,
//                     shopName: sellerDoc.shopName,
//                     sellerSubtotal: 0,
//                 };
//             }
//             sellerWiseSplit[sIdStr].sellerSubtotal += subtotal;

//             processedItems.push({
//                 productId: productDoc._id, name: item.name, quantity: qty,
//                 price: item.price, mrp: item.mrp || item.price, sellerId: sellerDoc._id,
//                 hsnCode: productDoc.hsnCode || "0000", image: item.image || ""
//             });
//         }

//         // 🌟 THE CRITICAL SYNC:
//         // Frontend anuppuna deliveryCharge-ah Number-ah maathi use panrom.
//         const frontendDeliveryAmount = Number(deliveryCharge) || 0;
//         const finalGrandTotal = totalItemTotal + frontendDeliveryAmount;

//         const finalSellerSplitData = Object.values(sellerWiseSplit).map((split) => {
//             const comm = (split.sellerSubtotal * settings.commissionPercent) / 100;
//             const gst = (comm * settings.gstOnCommissionPercent) / 100;
//             const tds = (split.sellerSubtotal * settings.tdsPercent) / 100;

//             return {
//                 sellerId: split.sellerId,
//                 shopName: split.shopName,
//                 sellerSubtotal: split.sellerSubtotal,
//                 commissionTotal: comm,
//                 gstTotal: gst,
//                 tdsTotal: tds,
//                 finalPayable: split.sellerSubtotal - (comm + gst + tds),
//                 status: 'Pending'
//             };
//         });

//         const newOrder = new Order({
//             customerId: user._id,
//             items: processedItems,
//             sellerSplitData: finalSellerSplitData,
//             billDetails: {
//                 itemTotal: totalItemTotal,
//                 deliveryCharge: frontendDeliveryAmount, // 👈 Ippo katchithama ₹160 vizhum
//                 totalAmount: finalGrandTotal
//             },
//             totalAmount: finalGrandTotal, // 🌟 PhonePe will now read correctly (₹1380)
//             paymentMethod,
//             shippingAddress,
//             status: "Pending",
//             paymentStatus: "Pending"
//         });

//         await newOrder.save();
//         res.status(201).json({ success: true, order: newOrder });

//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

// /* =====================================================
//     🌟 MASTER CREATE ORDER (1Cr Standard - Final Pro Edition)
//     Logic: Atomic Stock, Real-Time Logistics Sync, Split Finance
// ===================================================== */
// exports.createOrder = async (req, res) => {
//   try {
//     const {
//       items,
//       customerId,
//       shippingAddress,
//       paymentMethod,
//       deliveryCharge,
//     } = req.body;

//     // 1. User Validation
//     const user = await User.findById(customerId);
//     if (!user)
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });

//     // 2. Fetch Global Finance Settings
//     const settings = (await FinanceSettings.findOne()) || {
//       commissionPercent: 10,
//       gstOnCommissionPercent: 18,
//       tdsPercent: 2,
//     };

//     let totalItemTotal = 0;
//     let sellerWiseSplit = {};
//     const processedItems = [];

//     // 3. Process Items & Handle Logic Handshakes
//     for (const item of items) {
//       const productDoc = await Product.findById(item.productId || item._id);
//       const sellerDoc = await Seller.findById(
//         productDoc?.seller || item.sellerId,
//       );

//       if (!productDoc || !sellerDoc) continue;

//       const qty = Number(item.quantity);

//       // 🛡️ STOCK GUARD: Atomic verification
//       if (productDoc.stock < qty) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for ${productDoc.name}. Only ${productDoc.stock} left.`,
//         });
//       }

//       // 📉 ATOMIC STOCK REDUCTION
//       productDoc.stock -= qty;
//       if (productDoc.stock <= 0) {
//         productDoc.stock = 0;
//         productDoc.status = "inactive";
//       }
//       await productDoc.save();

//       const price = Number(item.price);
//       const subtotal = price * qty;
//       totalItemTotal += subtotal;

//       const sIdStr = sellerDoc._id.toString();

//       if (!sellerWiseSplit[sIdStr]) {
//         // 🚚 REAL-TIME LOGISTICS SYNC
//         // Weight conversion using our universal sanitizer
//         const weightVal = Number(productDoc.weight) || 500;
//         const weightKg = getWeightInKg(weightVal, productDoc.unit || "g") * qty;
//         const originPin =
//           sellerDoc.shopAddress?.pincode || sellerDoc.pincode || "600001";

//         // 📡 Delhivery API call for TEAM SHARE (Logistics cost)
//         const teamLogisticsCost = await getRealTimeRateInternal(
//           shippingAddress.pincode,
//           weightKg,
//           originPin,
//           paymentMethod === "COD" ? "COD" : "Pre-paid",
//         );

//         sellerWiseSplit[sIdStr] = {
//           sellerId: sellerDoc._id,
//           shopName: sellerDoc.shopName,
//           sellerSubtotal: 0,
//           teamShare: teamLogisticsCost, // 👈 Logistics Partner's Share
//           adminRevenue: 0, // 👈 Admin's Logistics Profit Margin
//         };
//       }

//       sellerWiseSplit[sIdStr].sellerSubtotal += subtotal;

//       // Prep items for DB storage
//       processedItems.push({
//         productId: productDoc._id,
//         name: productDoc.name,
//         quantity: qty,
//         price: price,
//         mrp: Number(item.mrp || price),
//         sellerId: sellerDoc._id,
//         hsnCode: productDoc.hsnCode || "0000",
//         image: productDoc.image || "",
//         itemStatus: "Placed" // Initial item status
//       });
//     }

//     // 🌟 ALLOCATE LOGISTICS REVENUE
//     // Frontend calculation (₹80 or ₹160) is stored in the first seller's bucket
//     const frontendDeliveryAmount = Number(deliveryCharge) || 0;
//     const firstSellerKey = Object.keys(sellerWiseSplit)[0];
//     if (firstSellerKey) {
//       sellerWiseSplit[firstSellerKey].adminRevenue = frontendDeliveryAmount;
//     }

//     const finalGrandTotal = totalItemTotal + frontendDeliveryAmount;

//     // 💰 FINANCE SPLIT CALCULATION (Per Seller)
//     const finalSellerSplitData = Object.values(sellerWiseSplit).map((split) => {
//       const comm = (split.sellerSubtotal * settings.commissionPercent) / 100;
//       const gst = (comm * settings.gstOnCommissionPercent) / 100;
//       const tds = (split.sellerSubtotal * settings.tdsPercent) / 100;

//       return {
//         sellerId: split.sellerId,
//         shopName: split.shopName,
//         sellerSubtotal: split.sellerSubtotal,
//         commissionTotal: comm,
//         gstTotal: gst,
//         tdsTotal: tds,
//         actualShippingCost: split.teamShare, 
//         customerChargedShipping: split.adminRevenue, 
//         finalPayableToSeller: split.sellerSubtotal - (comm + gst + tds), 
//         packageStatus: "Placed",
//       };
//     });

//     // 4. Create the Master Order Document
//     const newOrder = new Order({
//       customerId: user._id,
//       items: processedItems,
//       sellerSplitData: finalSellerSplitData,
//       billDetails: {
//         itemTotal: totalItemTotal,
//         deliveryCharge: frontendDeliveryAmount,
//         totalAmount: finalGrandTotal,
//       },
//       totalAmount: finalGrandTotal,
//       paymentMethod,
//       shippingAddress,
//       // Automatic status promotion for COD
//       status: paymentMethod === "COD" ? "Placed" : "Pending",
//       // 🛑 THE CRITICAL FIX: Default to 'Pending' for ONLINE payments!
//       paymentStatus: "Pending", 
//     });

//     // 💰 WALLET SYNC: Atomic Transaction
//     if (paymentMethod === "WALLET") {
//       if (user.walletBalance < finalGrandTotal) {
//         // Rollback Stock if wallet fails (Safety logic)
//         for (const item of processedItems) {
//           await Product.findByIdAndUpdate(item.productId, {
//             $inc: { stock: item.quantity },
//           });
//         }
//         return res
//           .status(400)
//           .json({ success: false, message: "Insufficient Wallet Balance" });
//       }

//       user.walletBalance -= finalGrandTotal;
//       user.walletTransactions.unshift({
//         amount: finalGrandTotal,
//         type: "DEBIT",
//         reason: `Payment for Order #${newOrder._id.toString().slice(-6).toUpperCase()}`,
//         date: new Date(),
//       });
//       await user.save();
      
//       // Since wallet deduction is successful right here, we mark it Paid & Placed
//       newOrder.status = "Placed"; 
//       newOrder.paymentStatus = "Paid"; 
//     }

//     await newOrder.save();
//     res.status(201).json({ success: true, order: newOrder });
//   } catch (err) {
//     console.error("CRITICAL ORDER ERROR:", err);
//     res.status(500).json({ success: false, error: "Internal System Failure" });
//   }
// };
/* =====================================================
    🌟 MASTER CREATE ORDER (1Cr Standard - Final Golden Edition)
    Logic: Product-level Free/Paid Check, Multi-Seller Revenue Split, 
           Atomic Stock Guard.
===================================================== */
exports.createOrder = async (req, res) => {
  try {
    const { items, customerId, shippingAddress, paymentMethod, deliveryCharge } = req.body;

    const user = await User.findById(customerId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const settings = (await FinanceSettings.findOne()) || {
      commissionPercent: 10,
      gstOnCommissionPercent: 18,
      tdsPercent: 2,
    };

    let totalItemTotal = 0;
    let sellerWiseSplit = {};
    const processedItems = [];

    // 1️⃣ PRODUCT-BY-PRODUCT ANALYSIS (Handles bulk 100+ items)
    for (const item of items) {
      const productDoc = await Product.findById(item.productId || item._id);
      const sellerDoc = await Seller.findById(productDoc?.seller || item.sellerId);

      if (!productDoc || !sellerDoc) continue;

      const qty = Number(item.quantity);

      // 🛡️ ATOMIC STOCK GUARD
      if (productDoc.stock < qty) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${productDoc.name}.` });
      }

      // BLOCK STOCK
      productDoc.stock -= qty;
      if (productDoc.stock <= 0) {
        productDoc.stock = 0;
        productDoc.status = "inactive";
      }
      await productDoc.save();

      const price = Number(item.price);
      const subtotal = price * qty;
      totalItemTotal += subtotal;

      const sIdStr = sellerDoc._id.toString();

      if (!sellerWiseSplit[sIdStr]) {
        // Prepare finance split container matching your Schema
        const weightVal = Number(productDoc.weight) || 500;
        const weightKg = getWeightInKg(weightVal, productDoc.unit || "g") * qty;
        const originPin = sellerDoc.shopAddress?.pincode || "600001";

        const teamLogisticsCost = await getRealTimeRateInternal(
          shippingAddress.pincode,
          weightKg,
          originPin,
          "Pre-paid"
        );

        sellerWiseSplit[sIdStr] = {
          sellerId: sellerDoc._id,
          shopName: sellerDoc.shopName,
          sellerSubtotal: 0,
          teamShare: teamLogisticsCost, 
          adminRevenue: 0, 
          hasPaidItem: false // 🌟 THE GOLDEN FLAG
        };
      }

      sellerWiseSplit[sIdStr].sellerSubtotal += subtotal;

      // 🌟 GOLDEN LOGIC: If even ONE item in this seller group is NOT free, the split is PAID.
      if (productDoc.isFreeDelivery === false) {
        sellerWiseSplit[sIdStr].hasPaidItem = true;
      }

      processedItems.push({
        productId: productDoc._id,
        name: productDoc.name,
        quantity: qty,
        price: price,
        mrp: Number(item.mrp || price),
        sellerId: sellerDoc._id,
        hsnCode: productDoc.hsnCode || "0000",
        image: productDoc.image || "",
        itemStatus: "Placed" 
      });
    }

    // 🚚 2️⃣ PRECISE REVENUE ALLOCATION (Splits Frontend Delivery Charge)
    const totalFrontendDelivery = Number(deliveryCharge) || 0;
    const paidSellers = Object.values(sellerWiseSplit).filter(s => s.hasPaidItem === true);
    
    if (paidSellers.length > 0) {
        // Divide total charge (e.g., ₹160) among sellers who had paid items
        const sharePerPaidSeller = totalFrontendDelivery / paidSellers.length;
        Object.keys(sellerWiseSplit).forEach(sId => {
            if (sellerWiseSplit[sId].hasPaidItem) {
                sellerWiseSplit[sId].adminRevenue = sharePerPaidSeller;
            }
        });
    }

    const finalGrandTotal = totalItemTotal + totalFrontendDelivery;

    // 💰 3️⃣ FINANCE SPLIT CALCULATION (Matches your Schema exactly)
    const finalSellerSplitData = Object.values(sellerWiseSplit).map((split) => {
      const comm = (split.sellerSubtotal * settings.commissionPercent) / 100;
      const gst = (comm * settings.gstOnCommissionPercent) / 100;
      const tds = (split.sellerSubtotal * settings.tdsPercent) / 100;

      return {
        sellerId: split.sellerId,
        shopName: split.shopName,
        sellerSubtotal: split.sellerSubtotal,
        commissionTotal: comm,
        gstTotal: gst,
        tdsTotal: tds,
        actualShippingCost: split.teamShare, 
        customerChargedShipping: split.adminRevenue, // 🌟 Fixed: No dumping, only split revenue
        finalPayableToSeller: split.sellerSubtotal - (comm + gst + tds), 
        packageStatus: "Placed",
      };
    });

    // 📝 4️⃣ MASTER ORDER CREATION
    const newOrder = new Order({
      customerId: user._id,
      items: processedItems,
      sellerSplitData: finalSellerSplitData,
      billDetails: {
        itemTotal: totalItemTotal,
        deliveryCharge: totalFrontendDelivery,
        totalAmount: finalGrandTotal,
      },
      totalAmount: finalGrandTotal,
      paymentMethod,
      shippingAddress,
      status: "Placed", 
      paymentStatus: "Pending", 
    });

    await newOrder.save();
    
    const finalStoredOrder = await Order.findById(newOrder._id);
    res.status(201).json({ success: true, order: finalStoredOrder });

  } catch (err) {
    console.error("❌ CRITICAL ORDER FAILURE:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
// 1. User Orders (OrderAgain matrum User Screen-ku)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.params.userId })
      .populate("items.productId")
      .populate({
        path: "items.sellerId",
        select: "shopName name address city",
      })
      .sort({ createdAt: -1 });

    let splittedOrders = [];

    orders.forEach((order) => {
      const orderObj = order.toObject();

      // 🌟 STEP: Indha order-la irukkura unique Sellers-ah kandupidi
      const uniqueSellers = [
        ...new Set(
          orderObj.items.map(
            (item) =>
              item.sellerId?._id?.toString() || item.sellerId?.toString(),
          ),
        ),
      ];

      // 🌟 STEP: Oru oru seller-ukkum oru separate entry create panroam
      uniqueSellers.forEach((sId) => {
        const sellerItems = orderObj.items.filter(
          (item) =>
            (item.sellerId?._id?.toString() || item.sellerId?.toString()) ===
            sId,
        );

        if (sellerItems.length > 0) {
          splittedOrders.push({
            ...orderObj,
            // Override: Indha specific entry-la indha seller items mattum dhaan irukanum
            items: sellerItems,
            // Header info strictly indha seller-oda thairukanum
            seller: sellerItems[0].sellerId || { shopName: "Zhopingo Store" },
          });
        }
      });
    });

    res.json({ success: true, data: splittedOrders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
/* =====================================================
    🔍 ADMIN GLOBAL ORDERS: Multi-Seller Split Logic (Free Delivery Sync)
===================================================== */
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customerId", "name phone email")
      .populate("items.productId")
      .populate({ path: "items.sellerId", select: "name shopName city phone" })
      .sort({ createdAt: -1 });

    let splittedOrdersList = [];

    orders.forEach((order) => {
      const orderObj = order.toObject();

      // 🌟 Step 1: Intha order-la unique Sellers theduroam
      const uniqueSellers = [
        ...new Set(
          orderObj.items.map(
            (item) =>
              item.sellerId?._id?.toString() || item.sellerId?.toString(),
          ),
        ),
      ];

      // 🌟 Step 2: Oru oru seller-ukkum order-ah divide panroam
      uniqueSellers.forEach((sId) => {
        const sellerItems = orderObj.items.filter(
          (item) =>
            (item.sellerId?._id?.toString() || item.sellerId?.toString()) ===
            sId,
        );

        if (sellerItems.length > 0) {
          // 🔥 THE FREE DELIVERY SYNC FIX:
          // Intha seller package-la eadhachum free delivery product irukka nu check panroam
          const isPackageFree = sellerItems.some(
            (item) => item.productId?.isFreeDelivery === true,
          );

          const sellerSubtotal = sellerItems.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0,
          );

          // 🚚 Delivery charge strictly from DB split data or fallback.
          // Oru vaelai package free-na strictly 0.
          let actualDeliveryCharge = isPackageFree
            ? 0
            : orderObj.billDetails?.deliveryCharge || 80;

          splittedOrdersList.push({
            ...orderObj,
            _id: orderObj._id,
            items: sellerItems,
            seller: sellerItems[0].sellerId || { shopName: "Zhopingo Store" },
            billDetails: {
              itemTotal: sellerSubtotal,
              deliveryCharge: actualDeliveryCharge, // 👈 0 if isPackageFree is true
              totalAmount: sellerSubtotal + actualDeliveryCharge,
            },
            totalAmount: sellerSubtotal + actualDeliveryCharge,
          });
        }
      });
    });

    res.json({ success: true, data: splittedOrdersList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
    🔍 SELLER ORDERS: Strictly Only Their Split Part (Free Delivery Fix)
===================================================== */
exports.getSellerOrders = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const orders = await Order.find({ "items.sellerId": sellerId })
      .populate("items.productId")
      .populate({
        path: "items.sellerId",
        select: "shopName name address city",
      })
      .sort({ createdAt: -1 });

    const splittedOrders = orders.map((order) => {
      const orderObj = order.toObject();
      const myItems = orderObj.items.filter(
        (item) =>
          (item.sellerId?._id?.toString() || item.sellerId?.toString()) ===
          sellerId,
      );

      // 🛡️ Filter only this seller's products & check free status
      const isPackageFree = myItems.some(
        (item) => item.productId?.isFreeDelivery === true,
      );
      const sellerSubtotal = myItems.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      );

      const actualDelivery = isPackageFree
        ? 0
        : orderObj.billDetails?.deliveryCharge || 80;

      return {
        ...orderObj,
        items: myItems,
        seller: myItems[0]?.sellerId || { shopName: "Merchant" },
        billDetails: {
          itemTotal: sellerSubtotal,
          deliveryCharge: actualDelivery,
          totalAmount: sellerSubtotal + actualDelivery,
        },
        totalAmount: sellerSubtotal + actualDelivery,
      };
    });

    res.json({ success: true, data: splittedOrders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.bypassPaymentAndShip = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    order.paymentStatus = "Paid";
    order.status = "Placed";
    await order.save();
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// exports.requestReturn = async (req, res) => {
//   try {
//     const { orderId, sellerId, reason } = req.body;
//     const order = await Order.findById(orderId);

//     if (!order)
//       return res
//         .status(404)
//         .json({ success: false, message: "Order not found" });

//     // Generate individual Return Tracking ID
//     const returnAWB = "RTN" + Math.floor(100000 + Math.random() * 900000);

//     let sellerItemsFound = false;
//     order.items.forEach((item) => {
//       if (item.sellerId.toString() === sellerId) {
//         // 🌟 Update status ONLY for this seller's item
//         item.itemStatus = "Return Requested";
//         item.itemAwbNumber = returnAWB;
//         item.isReturned = true;
//         item.returnReason = reason;
//         sellerItemsFound = true;
//       }
//     });

//     if (!sellerItemsFound)
//       return res
//         .status(400)
//         .json({
//           success: false,
//           message: "Invalid seller for this order split",
//         });

//     await order.save();
//     res.json({
//       success: true,
//       message: "Return request processed for specific seller package",
//       returnAWB,
//       data: order,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
/* =====================================================
    🔙 REQUEST RETURN (Customer App Trigger Only)
    Logic: Strictly ONLY register the request. No Logistics API yet.
===================================================== */
exports.requestReturn = async (req, res) => {
  try {
    const { orderId, sellerId, reason } = req.body;
    
    // 🛡️ Validation
    if (!orderId || !sellerId) {
      return res.status(400).json({ success: false, message: "Order ID and Seller ID are required." });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    let sellerFound = false;

    // 🌟 STEP 1: Sync Seller Split Data (For Seller Dashboard)
    // Inga logistics API-ah call panna koodadhu. Approval-ku waiting-nu kaattanum.
    order.sellerSplitData.forEach((split) => {
      if (split.sellerId.toString() === sellerId.toString()) {
        split.packageStatus = "Return Requested"; // 👈 Strictly 'Requested'
        split.adminRemarks = reason || "Customer requested return";
        sellerFound = true;
      }
    });

    // 🌟 STEP 2: Sync Individual Items (For Customer App UI)
    order.items.forEach((item) => {
      if (item.sellerId.toString() === sellerId.toString()) {
        item.itemStatus = "Return Requested";
        item.isReturned = false; // 👈 Innum return completed illa, so false.
        item.returnReason = reason;
      }
    });

    if (!sellerFound) {
      return res.status(400).json({ success: false, message: "Seller not found in this order." });
    }

    // 🌟 STEP 3: Status Promotion (Optional)
    // Motha order status-ah 'Return Requested'-nu maathalaam if needed
    order.status = "Return Requested";

    await order.save();

    res.json({
      success: true,
      message: "Return request submitted. Waiting for seller approval.",
      data: order,
    });

  } catch (err) {
    console.error("❌ RETURN REQUEST ERROR:", err.message);
    res.status(500).json({ success: false, error: "Internal Server Error during return request." });
  }
};

/* =====================================================
    🔍 GET SELLER RETURN REQUESTS (Only Return Requested)
===================================================== */
exports.getSellerReturnRequests = async (req, res) => {
  try {
    const { sellerId } = req.params;
    // Logic: Find orders where items contain this sellerId AND status is 'Return Requested'
    const orders = await Order.find({
      items: {
        $elemMatch: {
          sellerId: sellerId,
          itemStatus: "Return Requested",
        },
      },
    })
      .populate("items.productId")
      .populate("customerId", "name phone")
      .sort({ updatedAt: -1 });

    // Filter panni anupuroam so seller confusion aaga maataanga
    const results = orders.map((order) => {
      const orderObj = order.toObject();
      orderObj.items = orderObj.items.filter(
        (item) =>
          item.sellerId.toString() === sellerId &&
          item.itemStatus === "Return Requested",
      );
      return orderObj;
    });

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, sellerId, adminNote, awbNumber } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    let splitToUpdate = order.sellerSplitData.find(s => s.sellerId.toString() === sellerId?.toString());
    if (!splitToUpdate) return res.status(400).json({ success: false, message: "Seller split not found." });

    // 🌟 1. UPDATE STATUS & REMARKS
    splitToUpdate.packageStatus = status;
    splitToUpdate.adminRemarks = adminNote || splitToUpdate.adminRemarks;
    if (awbNumber) splitToUpdate.awbNumber = awbNumber;

    // 🌟 2. DATE LOGIC
    if (status === "Delivered") {
      splitToUpdate.deliveredDate = new Date();
    }
    
    if (status === "Returned") {
      splitToUpdate.returnDate = new Date();
    }

    // 🌟 3. ITEM STATUS SYNC & DYNAMIC REFUND CALCULATION
    let totalRefundToCustomer = 0;
    let itemsToRestore = [];
    
    // Status Strictly 'Returned' aana mattum dhaan Wallet credit pannanum
    if (status === "Returned") {
      order.items.forEach((item) => {
        if (item.sellerId.toString() === sellerId?.toString() && !item.isReturned) {
          // A. Item Price Refund (e.g., 100)
          totalRefundToCustomer += item.price * item.quantity;
          
          item.itemStatus = "Returned";
          item.isReturned = true;
          item.returnProcessedDate = new Date();
          itemsToRestore.push({ productId: item.productId, qty: item.quantity });
        }
      });

      // B. Shipping Charge Refund (e.g., 80)
      // Customer kitta namma vānguna forward shipping-aiyum thirumba kuduthuruvoam
      const sellerShippingCharge = splitToUpdate.customerChargedShipping || 0;
      totalRefundToCustomer += sellerShippingCharge;
    }

    // 💰 4. WALLET & STOCK ATOMIC SYNC
    if (status === "Returned" && totalRefundToCustomer > 0) {
      const user = await User.findById(order.customerId);
      if (user) {
        user.walletBalance += totalRefundToCustomer;
        user.walletTransactions.unshift({
          amount: totalRefundToCustomer,
          type: "CREDIT",
          reason: `Refund: Order #${order._id.toString().slice(-6).toUpperCase()} Returned (Incl. Shipping)`,
          date: new Date(),
        });
        await user.save();
        for (let r of itemsToRestore) {
          await Product.findByIdAndUpdate(r.productId, { $inc: { stock: r.qty }, $set: { status: "active" } });
        }
      }
    }

    // 🚚 5. DYNAMIC DELHIvery RVP (Approval Point)
    if (status === "Return Approved") {
      // Logic: createReversePickupInternal-la API response dynamic-ah varum
      const rvpResult = await createReversePickupInternal(order._id, sellerId);
      
      if (rvpResult.success && rvpResult.awb) {
        splitToUpdate.returnAwbNumber = rvpResult.awb;
        
        // 🔥 THE DYNAMIC LOGISTICS MATH:
        // 'rvpResult.cost' API-la irundhu vara real rate. 
        // Adhai already irukkura forward cost kooda add pannitta namma settlement math bullet-proof-ah aydum.
        const currentForwardCost = splitToUpdate.actualShippingCost || 0;
        const dynamicReturnCost = rvpResult.actualCost || rvpResult.rate || 0; 
        
        splitToUpdate.actualShippingCost = currentForwardCost + dynamicReturnCost;

        order.items.forEach(item => {
          if(item.sellerId.toString() === sellerId.toString()) item.itemAwbNumber = rvpResult.awb;
        });
      }
    }

    // 🛡️ 6. MASTER BADGE SYNC
    const allStatuses = order.sellerSplitData.map(s => s.packageStatus);
    if (allStatuses.every(s => s === "Delivered")) order.status = "Delivered";
    else if (allStatuses.every(s => s === "Returned")) order.status = "Returned";
    else order.status = "Partially Shipped";

    await order.save();
    res.json({ success: true, message: `Status updated to ${status} with Dynamic Logistics`, data: order });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { sellerId } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const split = order.sellerSplitData.find(s => s.sellerId.toString() === sellerId?.toString());
    if (!split) return res.status(400).json({ success: false, message: "Seller split not found." });

    // 🛡️ Security Guard: Already cancel aana thirumba panna vida koodadhu
    if (split.packageStatus === "Cancelled") return res.status(400).json({ success: false, message: "Already cancelled." });

    let refundAmount = 0;
    let itemsToRestore = [];

    // 1. Update Items & Stock prep
    order.items.forEach((item) => {
      if (item.sellerId.toString() === sellerId?.toString()) {
        item.itemStatus = "Cancelled";
        refundAmount += item.price * item.quantity;
        itemsToRestore.push({ productId: item.productId, qty: item.quantity });
      }
    });

    // 2. Wallet Refund (Only if Paid)
    if (order.paymentStatus === "Paid") {
      const user = await User.findById(order.customerId);
      if (user) {
        user.walletBalance += refundAmount;
        user.walletTransactions.unshift({ 
          amount: refundAmount, 
          type: "CREDIT", 
          reason: `Refund: Order #${order._id.toString().slice(-6).toUpperCase()} Cancelled`, 
          date: new Date() 
        });
        await user.save();
      }
    }

    // 3. Restore Stock
    for (let restore of itemsToRestore) {
      await Product.findByIdAndUpdate(restore.productId, { $inc: { stock: restore.qty }, $set: { status: "active" } });
    }

    // 4. Update Split Status (DON'T SPLICE!)
    split.packageStatus = "Cancelled"; // Record maintain aagum

    // 5. Logistics Sync
    if (split.awbNumber && split.awbNumber !== "128374922") { 
        await cancelShipmentInternal(split.awbNumber);
    }

    // 6. Master Status Sync
    const allStatuses = order.sellerSplitData.map(s => s.packageStatus);
    if (allStatuses.every(s => s === "Cancelled")) {
      order.status = "Cancelled";
      order.paymentStatus = "Refunded";
    }

    await order.save();
    res.json({ success: true, message: "Order Cancelled katchithama!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};