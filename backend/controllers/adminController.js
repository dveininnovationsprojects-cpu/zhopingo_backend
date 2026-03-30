const DeliveryCharge = require("../models/DeliveryCharge");
const Seller = require("../models/Seller");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendReelBlockNotification } = require("../utils/emailService");
const bcrypt = require("bcryptjs");
const FinanceSettings = require("../models/FinanceSettings");
const Settlement = require("../models/Settlement");
const WeightSlab = require("../models/WeightSlab");
const Order = require("../models/Order");
const mongoose = require("mongoose");
const JWT_SECRET = process.env.JWT_SECRET || "secret123";

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const DEFAULT_EMAIL = "admin@gmail.com";
    const DEFAULT_PASS = "admin@123";

    if (email === DEFAULT_EMAIL && password === DEFAULT_PASS) {
      // 1. அட்மின் இருக்காரான்னு பாரு
      let admin = await User.findOne({ role: "admin" });

      if (!admin) {
        // 2. ஒருவேளை அதே போன் நம்பர்ல கஸ்டமர் இருந்தா, அந்த 'unique' எர்ரரை தவிர்க்க
        // தற்காலிகமா அட்மினுக்கு வேற ஒரு நம்பர் கொடுத்துட்டு, அப்புறம் நீ ப்ரொபைல்ல மாத்திக்கலாம்.
        // அல்லது, டேட்டாபேஸ்ல 'Admin'னு ஒருத்தரை மட்டும் மேனுவலா கிரியேட் பண்ணிடு.

        admin = new User({
          name: "Admin da amala",
          email: DEFAULT_EMAIL,
          password: DEFAULT_PASS,
          role: "admin",
          phone: "0000000000", // 👈 இத முதல்ல குடு, அப்புறம் அப்டேட் பண்ணிக்கலாம்
        });
        await admin.save();
      }

      const token = jwt.sign({ id: admin._id, role: "admin" }, JWT_SECRET, {
        expiresIn: "7d",
      });

      return res.json({
        success: true,
        token,
        user: admin,
      });
    }
    return res.status(401).json({ success: false, message: "Invalid Admin" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.uploadDeliveryRates = async (req, res) => {
  try {
    const ratesArray = req.body;
    const operations = ratesArray.map((item) => ({
      updateOne: {
        filter: { pincode: item.pincode },
        update: { $set: { charge: item.charge } },
        upsert: true,
      },
    }));
    await DeliveryCharge.bulkWrite(operations);
    res.json({ success: true, message: "Delivery rates updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllSellers = async (req, res) => {
  try {
    const sellers = await Seller.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: sellers.length,
      data: sellers,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.verifySellerStatus = async (req, res) => {
  try {
    const { sellerId, status, reason } = req.body;

    const seller = await Seller.findById(sellerId);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    seller.kycStatus = status;
    seller.isVerified = status === "approved";

    if (reason) seller.rejectionReason = reason;

    await seller.save();

    res.json({
      success: true,
      message: `Seller has been ${status} successfully`,
      sellerData: seller,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await User.find({ role: "customer" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "can't get customer info",
      error: err.message,
    });
  }
};

exports.toggleBrandStatus = async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller)
      return res
        .status(404)
        .json({ success: false, message: "Seller not found" });

    seller.isBrand = !seller.isBrand;
    await seller.save();

    res.json({
      success: true,
      message: `Brand status updated to ${seller.isBrand}`,
      isBrand: seller.isBrand,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.blockReelByAdmin = async (req, res) => {
  try {
    const { reelId, reason } = req.body;

    const reel = await Reel.findById(reelId).populate("sellerId");
    if (!reel)
      return res
        .status(404)
        .json({ success: false, message: "Reel not found" });

    reel.isBlocked = true;
    reel.blockReason = reason;
    await reel.save();

    const seller = reel.sellerId;
    if (seller && seller.email) {
      try {
        await sendReelBlockNotification(seller.email, reel.description, reason);
      } catch (mailErr) {
        console.error("Email failed but reel blocked:", mailErr.message);
      }
    }

    res.json({
      success: true,
      message: "Reel blocked and seller notified via email",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
// Seller Status Toggle (Active/Inactive)
exports.updateSellerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Frontend-ல் இருந்து 'active' அல்லது 'inactive' வரும்

    const seller = await Seller.findById(id);
    if (!seller) {
      return res
        .status(404)
        .json({ success: false, message: "Seller not found" });
    }

    seller.status = status;
    await seller.save();

    res.json({
      success: true,
      message: `Seller is now ${status.toUpperCase()}`,
      data: seller,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
// 🌟 அட்மின் ப்ரொபைல் அப்டேட் (இங்க தான் நீ கேட்ட City, State வரும்)
exports.updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    const updatedAdmin = await User.findByIdAndUpdate(
      adminId,
      { $set: req.body }, // இங்க நீ City, State, Country எது அனுப்பினாலும் அப்டேட் ஆகும்
      { new: true, runValidators: true },
    ).select("-password");

    res.json({
      success: true,
      message: "Profile Updated!",
      data: updatedAdmin,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
// 3️⃣ அட்மின் ப்ரொபைல் விவரங்களை எடுக்க
exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id).select("-password");
    if (!admin)
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    res.json({ success: true, data: admin });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 2️⃣ பாஸ்வேர்ட் மாற்ற (Secured & Fixed)
exports.changeAdminPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // 1. அட்மினைத் தேடு
    const admin = await User.findById(req.user.id);
    if (!admin)
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });

    // 2. பழைய பாஸ்வேர்ட் மேட்ச் ஆகிறதா எனப் பார்
    const isMatch = await bcrypt.compare(oldPassword, admin.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Old password is wrong" });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ success: true, message: "Password Changed Successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 1. Get/Update Finance Settings
exports.getFinanceSettings = async (req, res) => {
  try {
    let settings = await FinanceSettings.findOne();
    if (!settings) settings = await FinanceSettings.create({});
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateFinanceSettings = async (req, res) => {
  try {
    const settings = await FinanceSettings.findOneAndUpdate({}, req.body, {
      upsert: true,
      new: true,
    });
    res.json({
      success: true,
      message: "Finance Settings Updated!",
      data: settings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// exports.generateWeeklySettlement = async (req, res) => {
//   try {
//     const { sellerId, startDate, endDate } = req.body;
//     const filterStart = new Date(startDate);
//     const filterEnd = new Date(endDate);
//     filterEnd.setHours(23, 59, 59, 999);

//     const settings = (await FinanceSettings.findOne()) || {
//       commissionPercent: 10,
//       gstOnCommissionPercent: 18,
//       tdsPercent: 2,
//     };

//     const orders = await Order.find({
//       "sellerSplitData.sellerId": new mongoose.Types.ObjectId(sellerId),
//       isSettled: { $ne: true },
//       $or: [
//         {
//           status: "Delivered",
//           updatedAt: { $gte: filterStart, $lte: filterEnd },
//         },
//         {
//           status: "Returned",
//           updatedAt: { $gte: filterStart, $lte: filterEnd },
//         },
//       ],
//     });

//     if (!orders || orders.length === 0) {
//       return res
//         .status(404)
//         .json({ success: false, message: "No eligible orders found." });
//     }

//     let payoutRows = [];
//     let summary = {
//       sales: 0,
//       comm: 0,
//       gst: 0,
//       tds: 0,
//       delivery: 0,
//       final: 0,
//       count: 0,
//     };

//     orders.forEach((order) => {
//       const split = order.sellerSplitData.find(
//         (s) => s.sellerId.toString() === sellerId,
//       );
//       if (split) {
//         summary.count++;
//         const isReturned = order.status === "Returned";

//         // 🌟 FIX: Getting total paid strictly from billDetails OR fallback to split amount
//         const totalPaidByCustomer =
//           order.billDetails?.totalAmount ||
//           order.totalAmount ||
//           split.sellerSubtotal ||
//           0;
//         const productAmount = split.sellerSubtotal || 0;

//         // Delivery Deduction calculation
//         const deliveryDeduction =
//           totalPaidByCustomer > productAmount
//             ? totalPaidByCustomer - productAmount
//             : 0;

//         if (isReturned) {
//           // RETURN LOGIC: Mirrored from UI Image 64
//           const returnFinalShare = -(totalPaidByCustomer + deliveryDeduction);

//           summary.sales -= totalPaidByCustomer;
//           summary.delivery += deliveryDeduction;
//           summary.final += returnFinalShare;

//           payoutRows.push({
//             orderId: order._id,
//             type: "RETURN",
//             amount: -totalPaidByCustomer,
//             comm_gst_tds: 0,
//             delivery_status: `+ ₹${deliveryDeduction}`,
//             net_payable: returnFinalShare,
//           });
//         } else {
//           // SALE LOGIC: Strictly Following Frontend Sequences
//           const platformComm =
//             productAmount * (Number(settings.commissionPercent) / 100);
//           const gstOnComm =
//             platformComm * (Number(settings.gstOnCommissionPercent) / 100);
//           const tdsOnComm = platformComm * (Number(settings.tdsPercent) / 100);

//           const totalFees = platformComm + gstOnComm + tdsOnComm;
//           const saleFinalShare =
//             totalPaidByCustomer - (totalFees + deliveryDeduction);

//           summary.sales += totalPaidByCustomer;
//           summary.comm += platformComm;
//           summary.gst += gstOnComm;
//           summary.tds += tdsOnComm;
//           summary.delivery += deliveryDeduction;
//           summary.final += saleFinalShare;

//           payoutRows.push({
//             orderId: order._id,
//             type: "SALE",
//             amount: totalPaidByCustomer,
//             comm_gst_tds: totalFees,
//             delivery_status: `- ₹${deliveryDeduction}`,
//             net_payable: saleFinalShare,
//           });
//         }
//       }
//     });

//     // 🌟 FINAL SYNC: Mapping calculated summary to Settlement fields
//     const newSettlement = new Settlement({
//       sellerId,
//       weekRange: `${startDate} to ${endDate}`,
//       payoutBreakdown: payoutRows,
//       orderCount: summary.count,
//       totalSales: Number(summary.sales.toFixed(2)),
//       commissionTotal: Number(summary.comm.toFixed(2)),
//       gstTotal: Number(summary.gst.toFixed(2)),
//       tdsTotal: Number(summary.tds.toFixed(2)),
//       deliveryTotal: Number(summary.delivery.toFixed(2)),
//       finalPayable: Number(summary.final.toFixed(2)), // 💰 Ippo 3907.80-nu katchithama varum
//       status: "Pending",
//     });

//     await newSettlement.save();

//     const orderIds = orders.map((o) => o._id);
//     await Order.updateMany(
//       { _id: { $in: orderIds } },
//       { $set: { isSettled: true } },
//     );

//     res.json({
//       success: true,
//       message: "Weekly Settlement Generated! ✅",
//       data: newSettlement,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };
// 🌟 1. GENERATE WEEKLY SETTLEMENT (Detailed Breakdown Sync)
exports.generateWeeklySettlement = async (req, res) => {
    try {
        const { sellerId, startDate, endDate } = req.body;
        const filterStart = new Date(startDate);
        filterStart.setHours(0, 0, 0, 0);
        const filterEnd = new Date(endDate);
        filterEnd.setHours(23, 59, 59, 999);

        const settings = (await FinanceSettings.findOne()) || { commissionPercent: 10, gstOnCommissionPercent: 18, tdsPercent: 2 };

        const orders = await Order.find({
            "sellerSplitData.sellerId": new mongoose.Types.ObjectId(sellerId),
            isSettled: { $ne: true },
            status: { $in: ["Delivered", "Returned"] },
            updatedAt: { $gte: filterStart, $lte: filterEnd }
        }).populate('items.productId');

        let settlement = await Settlement.findOne({ sellerId, weekRange: `${startDate} to ${endDate}` });

        if (!orders || orders.length === 0) {
            if (settlement) return res.json({ success: true, data: settlement });
            return res.status(404).json({ success: false, message: "No orders found." });
        }

        let newPayoutRows = [];
        let batchSummary = { sales: 0, comm: 0, gst: 0, tds: 0, delivery: 0, partnerShare: 0, adminProfit: 0, final: 0, count: 0 };

        orders.forEach((order) => {
            // 🎯 This specific seller's split data from the order
            const split = order.sellerSplitData.find(s => s.sellerId.toString() === sellerId);
            
            if (split) {
                const isReturned = order.status === "Returned";
                const isDelivered = order.status === "Delivered";

                // 🚚 LOGISTICS ENGINE (Based on DB response provided)
                // totalAmount (180) - sellerSubtotal (100) = 80 (Shipping)
                const totalBill = order.billDetails?.totalAmount || 0;
                
                // Order-la irukura ella sellers-oda subtotal-aiyum kootuna dhaan shipping katchithama theriyum
                const totalItemsRevenueInOrder = order.sellerSplitData.reduce((acc, curr) => acc + (curr.sellerSubtotal || 0), 0);
                
                const actualShippingPaidByCustomer = totalBill - totalItemsRevenueInOrder;
                const isFreeDeliveryForCustomer = actualShippingPaidByCustomer <= 0;

                // Logistics partner cost (API call amount or flat 40)
                const partnerCostPerItem = 40; 

                order.items.filter(item => item.sellerId.toString() === sellerId).forEach(p => {
                    const prodName = p.name || p.productId?.name || "Product";
                    
                    const alreadyPresent = settlement?.payoutBreakdown?.some(row => 
                        row.orderId.toString() === order._id.toString() && row.productName === prodName
                    );

                    if (!alreadyPresent) {
                        const itemPriceRevenue = p.price * p.quantity;
                        let cAmt = 0, gAmt = 0, tAmt = 0, sDeduction = 0, shipProfit = 0, net = 0;

                        if (isDelivered) {
                            cAmt = itemPriceRevenue * (settings.commissionPercent / 100);
                            gAmt = cAmt * (settings.gstOnCommissionPercent / 100);
                            tAmt = itemPriceRevenue * (settings.tdsPercent / 100);

                            if (!isFreeDeliveryForCustomer) {
                                // ✅ Case: PAID DELIVERY (Customer paid 80)
                                sDeduction = 0; // Seller pays nothing
                                // Admin Profit = 80 (from customer) - 40 (to partner) = 40
                                shipProfit = (actualShippingPaidByCustomer / order.items.length) - partnerCostPerItem;
                            } else {
                                // 🎁 Case: FREE DELIVERY (Customer paid 0)
                                sDeduction = 45 / order.items.length; // Seller pays flat fee
                                // Admin Profit = 45 (from seller) - 40 (to partner) = 5
                                shipProfit = sDeduction - partnerCostPerItem;
                            }

                            net = itemPriceRevenue - (cAmt + gAmt + tAmt + sDeduction);

                            batchSummary.sales += itemPriceRevenue;
                            batchSummary.comm += cAmt;
                            batchSummary.gst += gAmt;
                            batchSummary.tds += tAmt;
                            batchSummary.delivery += sDeduction;
                            batchSummary.partnerShare += partnerCostPerItem;
                            batchSummary.adminProfit += shipProfit;
                            batchSummary.final += net;
                        } else {
                            // 📉 RETURN LOGIC
                            net = -itemPriceRevenue;
                            batchSummary.sales -= itemPriceRevenue;
                            batchSummary.final -= itemPriceRevenue;
                        }

                        batchSummary.count++;

                        newPayoutRows.push({
                            orderId: order._id,
                            orderDate: order.createdAt,
                            statusDate: order.updatedAt,
                            deliveryDate: isDelivered ? order.updatedAt : null,
                            returnDate: isReturned ? order.updatedAt : null,
                            type: order.status.toUpperCase(),
                            productName: prodName,
                            quantity: p.quantity,
                            amount: isReturned ? -itemPriceRevenue : itemPriceRevenue,
                            commissionAmount: Number(cAmt.toFixed(2)),
                            gstAmount: Number(gAmt.toFixed(2)),
                            tdsAmount: Number(tAmt.toFixed(2)),
                            
                            // 🚚 Breakdown Logistics Transparency
                            deliveryType: isFreeDeliveryForCustomer ? "FREE" : "PAID",
                            customerPaidShipping: Number((actualShippingPaidByCustomer / order.items.length).toFixed(2)),
                            sellerDeduction: Number(sDeduction.toFixed(2)),
                            logisticsPartnerCost: Number(partnerCostPerItem.toFixed(2)),
                            adminProfitOnShipping: Number(shipProfit.toFixed(2)),
                            
                            netPayable: Number(net.toFixed(2))
                        });
                    }
                });
            }
        });

        // 🌟 FINAL ATOMIC UPSERT
        if (newPayoutRows.length > 0) {
            if (settlement) {
                settlement.payoutBreakdown.push(...newPayoutRows);
                settlement.orderCount += batchSummary.count;
                settlement.totalSales = Number((settlement.totalSales + batchSummary.sales).toFixed(2));
                settlement.commissionTotal = Number((settlement.commissionTotal + batchSummary.comm).toFixed(2));
                settlement.gstTotal = Number((settlement.gstTotal + batchSummary.gst).toFixed(2));
                settlement.tdsTotal = Number((settlement.tdsTotal + batchSummary.tds).toFixed(2));
                settlement.deliveryTotal = Number((settlement.deliveryTotal + batchSummary.delivery).toFixed(2));
                settlement.logisticsPartnerShare = Number((settlement.logisticsPartnerShare + batchSummary.partnerShare).toFixed(2));
                settlement.adminLogisticsProfit = Number((settlement.adminLogisticsProfit + batchSummary.adminProfit).toFixed(2));
                settlement.finalPayable = Number((settlement.finalPayable + batchSummary.final).toFixed(2));
            } else {
                settlement = new Settlement({
                    sellerId, weekRange: `${startDate} to ${endDate}`,
                    payoutBreakdown: newPayoutRows,
                    orderCount: batchSummary.count,
                    totalSales: Number(batchSummary.sales.toFixed(2)),
                    commissionTotal: Number(batchSummary.comm.toFixed(2)),
                    gstTotal: Number(batchSummary.gst.toFixed(2)),
                    tdsTotal: Number(batchSummary.tds.toFixed(2)),
                    deliveryTotal: Number(batchSummary.delivery.toFixed(2)),
                    logisticsPartnerShare: Number(batchSummary.partnerShare.toFixed(2)),
                    adminLogisticsProfit: Number(batchSummary.adminProfit.toFixed(2)),
                    finalPayable: Number(batchSummary.final.toFixed(2))
                });
            }
            await settlement.save();
            await Order.updateMany({ _id: { $in: orders.map(o => o._id) } }, { $set: { isSettled: true } });
        }

        const finalData = await Settlement.findById(settlement?._id || settlement).populate('sellerId', 'shopName email');
        res.json({ success: true, message: "Detailed Payout Sync Success! ✅", data: finalData });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
// 3. Mark as Paid (🌟 Strictly Button Click - No Body Needed)
exports.markSettlementAsPaid = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find settlement
    const settlement = await Settlement.findById(id);
    if (!settlement)
      return res
        .status(404)
        .json({ success: false, message: "Settlement not found" });

    // 2. Already paid check
    if (settlement.status === "Paid") {
      return res
        .status(400)
        .json({ success: false, message: "Already marked as PAID" });
    }

    // 🌟 CHANGE: No destructuring from req.body anymore!
    settlement.status = "Paid";
    settlement.paymentDate = new Date();

    await settlement.save();

    // 🚀 SYNC: Update Seller Ledger & Dashboard
    // Internal function call reference fix
    if (exports.createLedgerEntryForPayout) {
      await exports.createLedgerEntryForPayout(
        settlement.sellerId,
        settlement.finalPayable,
      );
    }

    res.json({
      success: true,
      message: "Payment Success! Status changed to PAID ✅",
      data: settlement,
    });
  } catch (err) {
    console.error("Payout Button Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
// 🌟 1. API for Daily Orders View (Settlement aagaadha orders)
exports.getPendingDailyOrders = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const orders = await Order.find({
      "sellerSplitData.sellerId": sellerId,
      status: "Delivered",
      isSettled: { $ne: true }, // 👈 Settle aagaadha orders mattum
    }).sort({ createdAt: 1 });

    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🚚 Global Logistics Settlement (Bulk Pay for Delivery Team)
exports.generateGlobalLogisticsSettlement = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // 1. Intha range-la irukkura ELLA Delivered orders-aiyum fetch panroam
    const orders = await Order.find({
      status: "Delivered",
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    });

    if (orders.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "No delivered orders found." });

    let stats = {
      orderCount: 0,
      customerPaidTotal: 0,
      actualPartnerCost: 0,
    };

    orders.forEach((order) => {
      stats.orderCount++;
      // Customer pay panna delivery charge (Total bill-la irundhu)
      stats.customerPaidTotal += order.billDetails?.deliveryCharge || 0;

      // Intha order-la irukkura ella packages-oda actual shipping cost-ah kootuvom
      order.sellerSplitData.forEach((split) => {
        stats.actualPartnerCost += split.actualLogisticsCost || 45; // Staging fallback
      });
    });

    const newLogisticsBill = new LogisticsSettlement({
      weekRange: `${startDate} to ${endDate}`,
      totalOrders: stats.orderCount,
      totalCustomerPaidDelivery: stats.customerPaidTotal,
      totalPayableToLogistics: stats.actualPartnerCost,
      netAdminLogisticsProfit:
        stats.customerPaidTotal - stats.actualPartnerCost,
      status: "Pending",
    });

    await newLogisticsBill.save();

    res.json({
      success: true,
      message: "Global Logistics Bill Generated!",
      data: newLogisticsBill,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. WEIGHT SLABS (For Admin reference & Manual Override if API fails)
exports.manageWeightSlabs = async (req, res) => {
  try {
    const slabs = await WeightSlab.find();
    res.json({ success: true, data: slabs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Add or Update Weight Slab
exports.upsertWeightSlab = async (req, res) => {
  try {
    const { label, minWeight, maxWeight, rate } = req.body;
    const slab = await WeightSlab.findOneAndUpdate(
      { label },
      { minWeight, maxWeight, rate },
      { upsert: true, new: true },
    );
    res.json({ success: true, message: "Weight slab updated!", data: slab });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete Slab
exports.deleteWeightSlab = async (req, res) => {
  try {
    await WeightSlab.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Slab removed!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllSettlements = async (req, res) => {
  try {
    const settlements = await Settlement.find()
      .populate("sellerId", "shopName email") // 🌟 Seller name theriya populate panrom
      .sort({ createdAt: -1 }); // Latest settlement top-la vara

    res.json({
      success: true,
      count: settlements.length,
      data: settlements,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const Ledger = require("../models/Ledger");

// 🌟 logic A: Get All Ledger Entries for Admin View
exports.getAllLedgerEntries = async (req, res) => {
  try {
    const entries = await Ledger.find()
      .populate("sellerId", "shopName")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🚀 Logic B: Auto-Entry when Order is Delivered (Call this inside Order status update)
exports.createLedgerEntryForOrder = async (sellerId, orderId, amount) => {
  try {
    // 1. Last balance-ai instantaneous-ah find panrom
    const lastEntry = await Ledger.findOne({ sellerId }).sort({
      createdAt: -1,
    });
    const currentBalance = lastEntry ? lastEntry.balance : 0;

    // 2. New balance calculation: Last Balance + Current Credit
    const newEntry = new Ledger({
      sellerId,
      orderId,
      type: "Order_Sale",
      credit: amount,
      balance: currentBalance + amount,
      description: `Credit for Order #${orderId.toString().slice(-6)}`,
    });
    await newEntry.save();
  } catch (err) {
    console.error("Ledger Credit Error:", err.message);
  }
};

// 🚀 Logic C: Auto-Entry when Payout is Paid (Call this inside markSettlementAsPaid)
exports.createLedgerEntryForPayout = async (sellerId, amount) => {
  try {
    const lastEntry = await Ledger.findOne({ sellerId }).sort({
      createdAt: -1,
    });
    const currentBalance = lastEntry ? lastEntry.balance : 0;

    // Formula: Last Balance - Current Debit
    const newEntry = new Ledger({
      sellerId,
      type: "Weekly_Payout",
      debit: amount,
      balance: currentBalance - amount,
      description: `Weekly payout processed`,
    });
    await newEntry.save();
  } catch (err) {
    console.error("Ledger Debit Error:", err.message);
  }
};

// 🌟 41. Fetch specific seller settlements for auto-sync logic
exports.getSellerSettlements = async (req, res) => {
  try {
    const data = await Settlement.find({ sellerId: req.params.sellerId }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSellerLedger = async (req, res) => {
  try {
    const data = await Ledger.find({ sellerId: req.params.sellerId }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


// 🌟 2. Admin can view any seller's KYC documents strictly
exports.getSellerKycForAdmin = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const seller = await Seller.findById(sellerId).select("name shopName email phone kycDocuments kycStatus panNumber gstNumber fssaiNumber msmeNumber rejectionReason");

        if (!seller) {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }

        res.json({
            success: true,
            data: seller
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};