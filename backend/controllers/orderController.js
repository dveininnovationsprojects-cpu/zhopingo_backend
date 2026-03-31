const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const Seller = require("../models/Seller");
const FinanceSettings = require("../models/FinanceSettings");

const mongoose = require("mongoose");

// 🌟 THE SYNC: Logistics controller-la irundhu internal function-ah import panrom
const {
  getRealTimeRateInternal,
  getWeightInKg,
  processShipmentCreation // 👈 IDHU KANDIPPA IRUKKANUM!
}

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
    🌟 MASTER CREATE ORDER (1Cr Standard - Final Pro Edition)
    Logic: Atomic Stock, Real-Time Logistics Sync, Split Finance + Wallet AWB Fix
===================================================== */
exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      customerId,
      shippingAddress,
      paymentMethod,
      deliveryCharge,
    } = req.body;

    // 1. User Validation
    const user = await User.findById(customerId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // 2. Fetch Global Finance Settings
    const settings = (await FinanceSettings.findOne()) || {
      commissionPercent: 10,
      gstOnCommissionPercent: 18,
      tdsPercent: 2,
    };

    let totalItemTotal = 0;
    let sellerWiseSplit = {};
    const processedItems = [];

    // 3. Process Items & Handle Logic Handshakes
    for (const item of items) {
      const productDoc = await Product.findById(item.productId || item._id);
      const sellerDoc = await Seller.findById(
        productDoc?.seller || item.sellerId,
      );

      if (!productDoc || !sellerDoc) continue;

      const qty = Number(item.quantity);

      // 🛡️ STOCK GUARD: Atomic verification
      if (productDoc.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${productDoc.name}. Only ${productDoc.stock} left.`,
        });
      }

      // 📉 ATOMIC STOCK REDUCTION
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
        // 🚚 REAL-TIME LOGISTICS SYNC
        const weightVal = Number(productDoc.weight) || 500;
        const weightKg = getWeightInKg(weightVal, productDoc.unit || "g") * qty;
        const originPin =
          sellerDoc.shopAddress?.pincode || sellerDoc.pincode || "600001";

        // 📡 Delhivery API call for TEAM SHARE (Logistics cost)
        const teamLogisticsCost = await getRealTimeRateInternal(
          shippingAddress.pincode,
          weightKg,
          originPin,
          paymentMethod === "COD" ? "COD" : "Pre-paid",
        );

        sellerWiseSplit[sIdStr] = {
          sellerId: sellerDoc._id,
          shopName: sellerDoc.shopName,
          sellerSubtotal: 0,
          teamShare: teamLogisticsCost, // 👈 Logistics Partner's Share (e.g. ₹39)
          adminRevenue: 0, // 👈 Admin's Logistics Profit Margin (e.g. ₹80)
        };
      }

      sellerWiseSplit[sIdStr].sellerSubtotal += subtotal;

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

    const frontendDeliveryAmount = Number(deliveryCharge) || 0;
    const firstSellerKey = Object.keys(sellerWiseSplit)[0];
    if (firstSellerKey) {
      sellerWiseSplit[firstSellerKey].adminRevenue = frontendDeliveryAmount;
    }

    const finalGrandTotal = totalItemTotal + frontendDeliveryAmount;

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
        customerChargedShipping: split.adminRevenue, 
        finalPayableToSeller: split.sellerSubtotal - (comm + gst + tds), 
        packageStatus: "Placed",
      };
    });

    const newOrder = new Order({
      customerId: user._id,
      items: processedItems,
      sellerSplitData: finalSellerSplitData,
      billDetails: {
        itemTotal: totalItemTotal,
        deliveryCharge: frontendDeliveryAmount,
        totalAmount: finalGrandTotal,
      },
      totalAmount: finalGrandTotal,
      paymentMethod,
      shippingAddress,
      status: paymentMethod === "COD" ? "Placed" : "Pending",
      paymentStatus: "Pending", 
    });

    // 💰 WALLET SYNC: Atomic Transaction + AWB Trigger
    if (paymentMethod === "WALLET") {
      if (user.walletBalance < finalGrandTotal) {
        for (const item of processedItems) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity },
          });
        }
        return res
          .status(400)
          .json({ success: false, message: "Insufficient Wallet Balance" });
      }

      user.walletBalance -= finalGrandTotal;
      user.walletTransactions.unshift({
        amount: finalGrandTotal,
        type: "DEBIT",
        reason: `Payment for Order #${newOrder._id.toString().slice(-6).toUpperCase()}`,
        date: new Date(),
      });
      await user.save();
      
      newOrder.status = "Placed"; 
      newOrder.paymentStatus = "Paid"; 

      // 🚀 THE MASTER SYNC TRIGGER: Wallet-ku payment success, so ippo shipment create pannanum
      // Indha loop thaan unakku missing-ah irundhuchi, ippo katchithama sethutaen.
      for (let split of newOrder.sellerSplitData) {
        try {
           // Industrial logic: Online/Wallet success aana udane AWB automatic-ah hit aaganum
           const shipmentRes = await exports.processShipmentCreation(
              newOrder._id, 
              split.sellerId, 
              split.shopName
           );
           if(shipmentRes.success) {
              console.log(`✅ AWB Sync Success for ${split.shopName}: ${shipmentRes.awb}`);
           }
        } catch (shipErr) {
           console.error(`❌ Shipment Auto-Trigger Error: ${shipErr.message}`);
        }
      }
    }

    await newOrder.save();
    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    console.error("CRITICAL ORDER ERROR:", err);
    res.status(500).json({ success: false, error: "Internal System Failure" });
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

exports.requestReturn = async (req, res) => {
  try {
    const { orderId, sellerId, reason } = req.body;
    const order = await Order.findById(orderId);

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // Generate individual Return Tracking ID
    const returnAWB = "RTN" + Math.floor(100000 + Math.random() * 900000);

    let sellerItemsFound = false;
    order.items.forEach((item) => {
      if (item.sellerId.toString() === sellerId) {
        // 🌟 Update status ONLY for this seller's item
        item.itemStatus = "Return Requested";
        item.itemAwbNumber = returnAWB;
        item.isReturned = true;
        item.returnReason = reason;
        sellerItemsFound = true;
      }
    });

    if (!sellerItemsFound)
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid seller for this order split",
        });

    await order.save();
    res.json({
      success: true,
      message: "Return request processed for specific seller package",
      returnAWB,
      data: order,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

// /* =====================================================
//     🚚 UPDATE ORDER STATUS (Handover to Admin/Seller)
// ===================================================== */
// exports.updateOrderStatus = async (req, res) => {
//     try {
//         const { status, sellerId, adminNote } = req.body;
//         const order = await Order.findById(req.params.orderId);

//         if (!order) return res.status(404).json({ success: false, message: "Order not found" });

//         let sellerPackageFound = false;
//         let totalRefundAmount = 0;

//         // 🌟 STEP 1: Sync Seller Split Data
//         order.sellerSplitData.forEach(split => {
//             if (split.sellerId.toString() === sellerId?.toString()) {
//                 split.packageStatus = status;
//                 if (status === 'Returned') {
//                     split.returnDate = new Date();
//                 }
//                 sellerPackageFound = true;
//             }
//         });

//         // 🌟 STEP 2: Sync Individual Items & Prep Refund
//         order.items.forEach(item => {
//             if (item.sellerId.toString() === sellerId?.toString()) {
//                 item.itemStatus = status;

//                 // 🔥 IMMEDIATE REFUND CALCULATION: If status is 'Returned'
//                 if (status === 'Returned') {
//                     totalRefundAmount += (item.price * item.quantity);
//                     item.isReturned = true;
//                     item.returnProcessedDate = new Date();
//                 }
//             }
//         });

//         if (!sellerPackageFound) return res.status(400).json({ success: false, message: "Seller data sync failed." });

//         // 💰 STEP 3: WALLET REFUND TRIGGER (Atomic Action)
//         if (status === 'Returned' && totalRefundAmount > 0) {
//             const user = await User.findById(order.customerId);
//             if (user) {
//                 user.walletBalance += totalRefundAmount;
//                 user.walletTransactions.unshift({
//                     amount: totalRefundAmount,
//                     type: 'CREDIT',
//                     reason: `Refund: Order #${order._id.toString().slice(-6).toUpperCase()} Return Approved`,
//                     date: new Date()
//                 });
//                 await user.save();

//                 // Overall order check: If every seller is returned, order is fully 'Refunded'
//                 const allDone = order.items.every(i => i.itemStatus === 'Returned' || i.itemStatus === 'Cancelled');
//                 if (allDone) order.paymentStatus = 'Refunded';
//             }
//         }

//         // 🛡️ STEP 4: MASTER BADGE SYNC
//         const allStatuses = order.sellerSplitData.map(s => s.packageStatus);
//         if (allStatuses.every(s => s === 'Returned')) {
//             order.status = 'Returned';
//         } else if (allStatuses.some(s => s === 'Returned')) {
//             order.status = 'Partially Returned';
//         }

//         await order.save();
//         res.json({ success: true, message: "Status sync and Refund success!", data: order });

//     } catch (err) {
//         res.status(500).json({ success: false, error: err.message });
//     }
// };

/* =====================================================
    🚚 UPDATE ORDER STATUS (Handover & Refund Logic)
===================================================== */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, sellerId, adminNote, awbNumber } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    let sellerPackageFound = false;
    let totalRefundAmount = 0;
    let itemsToRestore = [];

    // 🌟 STEP 1: Sync Seller Split Data & Security Guard
    for (let split of order.sellerSplitData) {
      if (split.sellerId.toString() === sellerId?.toString()) {
        // 🛡️ Guard: Already processed-ah irundha double-dip panna koodadhu
        if (split.packageStatus === "Returned" && status === "Returned") {
          return res
            .status(400)
            .json({
              success: false,
              message: "Package already returned and refunded.",
            });
        }

        split.packageStatus = status;
        split.adminRemarks = adminNote || split.adminRemarks;

        // Real-time AWB update if provided during 'Shipped' status
        if (awbNumber) split.awbNumber = awbNumber;

        if (status === "Delivered") split.deliveredDate = new Date();
        if (status === "Returned") split.returnDate = new Date();

        sellerPackageFound = true;
      }
    }

    if (!sellerPackageFound)
      return res
        .status(400)
        .json({ success: false, message: "Seller split not found." });

    // 🌟 STEP 2: Item Status Handshake & Inventory Prep
    for (let item of order.items) {
      if (item.sellerId.toString() === sellerId?.toString()) {
        // Logic: Item status promote panna porom
        if (status === "Returned" && item.itemStatus !== "Returned") {
          totalRefundAmount += item.price * item.quantity;
          item.isReturned = true;
          item.returnProcessedDate = new Date();

          // 📉 Restore stock prep
          itemsToRestore.push({
            productId: item.productId,
            qty: item.quantity,
          });
        }

        item.itemStatus = status;
        if (awbNumber) item.itemAwbNumber = awbNumber;
      }
    }

    // 💰 STEP 3: ATOMIC WALLET REFUND & STOCK RESTORATION
    if (status === "Returned" && totalRefundAmount > 0) {
      const user = await User.findById(order.customerId);
      if (user) {
        user.walletBalance += totalRefundAmount;
        user.walletTransactions.unshift({
          amount: totalRefundAmount,
          type: "CREDIT",
          reason: `Refund: Order #${order._id.toString().slice(-6).toUpperCase()} Approved`,
          date: new Date(),
        });
        await user.save();

        // 🔄 Industrial Stock Sync: Products-ah thirumba sale-ku kootitu varom
        for (let restore of itemsToRestore) {
          await Product.findByIdAndUpdate(restore.productId, {
            $inc: { stock: restore.qty },
            $set: { status: "active" },
          });
        }

        // Global Order Sync: Ellaa seller-um return pannunaa order is 'Refunded'
        const allSettled = order.items.every(
          (i) => i.itemStatus === "Returned" || i.itemStatus === "Cancelled",
        );
        if (allSettled) order.paymentStatus = "Refunded";
      }
    }

    // 🛡️ STEP 4: MASTER ORDER BADGE SYNC
    const allPackageStatuses = order.sellerSplitData.map(
      (s) => s.packageStatus,
    );

    if (allPackageStatuses.every((s) => s === "Delivered")) {
      order.status = "Delivered";
    } else if (allPackageStatuses.every((s) => s === "Returned")) {
      order.status = "Returned";
    } else if (
      allPackageStatuses.some((s) => s === "Shipped" || s === "Delivered")
    ) {
      // Multi-seller case: partial completion
      order.status = "Partially Shipped";
    }

    await order.save();
    res.json({
      success: true,
      message: `Status updated to ${status} katchithama!`,
      data: order,
    });
  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const { sellerId } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // 1️⃣ Find Seller Split Index
    const sellerSplitIndex = order.sellerSplitData.findIndex(
      (split) => split.sellerId.toString() === sellerId?.toString(),
    );

    if (sellerSplitIndex === -1) {
      return res
        .status(400)
        .json({ success: false, message: "Seller already removed." });
    }

    let refundAmount = 0;
    let sellerItemsFound = false;

    // 2️⃣ Update Status Strictly for this seller
    order.items.forEach((item) => {
      if (item.sellerId.toString() === sellerId?.toString()) {
        item.itemStatus = "Cancelled"; // 👈 Seller products strictly Cancelled
        refundAmount += item.price * item.quantity;
        sellerItemsFound = true;
      }
    });

    // 💰 3️⃣ WALLET REFUND
    if (order.paymentStatus === "Paid") {
      const user = await User.findById(order.customerId);
      if (user) {
        user.walletBalance += refundAmount;
        user.walletTransactions.unshift({
          amount: refundAmount,
          type: "CREDIT",
          reason: `Split Refund: Order #${order._id.toString().slice(-6).toUpperCase()}`,
          date: new Date(),
        });
        await user.save();
      }
    }

    // 🛡️ 4️⃣ REMOVE FROM PAYOUT LIST
    order.sellerSplitData.splice(sellerSplitIndex, 1);

    // 🛡️ 5️⃣ MASTER STATUS SYNC (No Partially Cancelled Badge)
    const allStatuses = order.items.map((i) => i.itemStatus);
    if (allStatuses.every((s) => s === "Cancelled")) {
      order.status = "Cancelled";
      order.paymentStatus = "Refunded";
    } else {
      // Logic: Do NOT change main order status to 'Partially Cancelled'
      // Keep it as Placed/Shipped based on other sellers
      const remainingActive = order.items.some(
        (i) => i.itemStatus === "Shipped" || i.itemStatus === "Delivered",
      );
      order.status = remainingActive ? "Shipped" : "Placed";
    }

    await order.save();
    res.json({
      success: true,
      message: "Seller products cancelled successfully.",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
