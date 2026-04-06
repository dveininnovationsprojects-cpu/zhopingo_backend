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
//     try {
//         const { sellerId, startDate, endDate } = req.body;
//         const filterStart = new Date(startDate);
//         filterStart.setHours(0, 0, 0, 0);
//         const filterEnd = new Date(endDate);
//         filterEnd.setHours(23, 59, 59, 999);

//         const settings = (await FinanceSettings.findOne()) || { commissionPercent: 10, gstOnCommissionPercent: 18, tdsPercent: 2 };

//         const orders = await Order.find({
//             "sellerSplitData.sellerId": sellerId, 
//             isSettled: { $ne: true },
//             status: { $in: ["Delivered", "Returned"] },
//             updatedAt: { $gte: filterStart, $lte: filterEnd }
//         }).populate('items.productId');

//         let settlement = await Settlement.findOne({ sellerId, weekRange: `${startDate} to ${endDate}` });

//         if (!orders || orders.length === 0) {
//             if (settlement) return res.json({ success: true, data: settlement });
//             return res.status(404).json({ success: false, message: "No eligible orders found." });
//         }

//         let newPayoutRows = [];
//         let batchStats = { sales: 0, comm: 0, gst: 0, tds: 0, delivDed: 0, partnerBill: 0, adminProf: 0, final: 0, count: 0 };

//         orders.forEach((order) => {
//             const split = order.sellerSplitData.find(s => s.sellerId.toString() === sellerId);
//             if (split) {
//                 const isReturned = order.status === "Returned";
                
//                 // 🌟 YOUR GOD LEVEL DETECTION LOGIC (STRICTLY UNTOUCHED)
//                 const totalShippingChargedToCustomer = order.billDetails?.deliveryCharge || 0;
//                 const isPaidDelivery = totalShippingChargedToCustomer > 0;

//                 // 🚀 PURE DYNAMIC DATA MAPPING
//                 const realPartnerFee = Number(split.actualShippingCost || 0); 
//                 const dynamicFreeDeduction = Number(split.deliveryDeduction || 0);

//                 const sellerItems = order.items.filter(item => item.sellerId.toString() === sellerId);
//                 const sellerItemCount = sellerItems.length;

//                 sellerItems.forEach(p => {
//                     const prodName = p.name || p.productId?.name || "Product";
                    
//                     const alreadyPresent = settlement?.payoutBreakdown?.some(row => 
//                         row.orderId.toString() === order._id.toString() && row.productName === prodName
//                     );

//                     if (!alreadyPresent) {
//                         const productPrice = p.price * p.quantity;
//                         let cAmt = 0, gAmt = 0, tAmt = 0, sDed = 0, adminShipProf = 0, net = 0;
//                         const partnerSharePerItem = realPartnerFee / sellerItemCount;

//                         if (order.status === "Delivered") {
//                             cAmt = productPrice * (settings.commissionPercent / 100);
//                             gAmt = cAmt * (settings.gstOnCommissionPercent / 100);
//                             tAmt = productPrice * (settings.tdsPercent / 100);

//                             if (isPaidDelivery) {
//                                 // ✅ PAID: Customer pays, Delhivery takes. Profit = (Charged - Partner)
//                                 sDed = 0; 
//                                 adminShipProf = (totalShippingChargedToCustomer / sellerItemCount) - partnerSharePerItem;
//                             } else {
//                                 // 🎁 FREE: Seller pays, Delhivery takes. Profit = 0 (Exactly what you asked)
//                                 // We take from seller ONLY what is needed to pay Delhivery.
//                                 sDed = partnerSharePerItem; 
//                                 adminShipProf = 0; 
//                             }

//                             net = productPrice - (cAmt + gAmt + tAmt + sDed);

//                             // 📊 Update Batch Statistics
//                             batchStats.sales += productPrice;
//                             batchStats.comm += cAmt;
//                             batchStats.gst += gAmt;
//                             batchStats.tds += tAmt;
//                             batchStats.delivDed += sDed;
//                             batchStats.partnerBill += partnerSharePerItem;
//                             batchStats.adminProf += adminShipProf;
//                             batchStats.final += net;
//                         } else {
//                             // 🛑 RETURN Logic
//                             net = -productPrice;
//                             batchStats.sales -= productPrice;
//                             batchStats.final -= productPrice;
//                         }

//                         batchStats.count++;

//                         newPayoutRows.push({
//                             orderId: order._id,
//                             productName: prodName,
//                             type: order.status.toUpperCase(),
//                             customerPaidTotal: Number((productPrice + (totalShippingChargedToCustomer / sellerItemCount)).toFixed(2)),
//                             productPriceOnly: productPrice,
//                             platformCommission: Number(cAmt.toFixed(2)),
//                             gstOnCommission: Number(gAmt.toFixed(2)),
//                             tdsDeduction: Number(tAmt.toFixed(2)),
                            
//                             shippingType: isPaidDelivery ? "PAID" : "FREE",
//                             customerPaidShipping: Number((totalShippingChargedToCustomer / sellerItemCount).toFixed(2)),
//                             sellerShippingDeduction: Number(sDed.toFixed(2)),
//                             logisticsPartnerCost: Number(partnerSharePerItem.toFixed(2)),
//                             adminShippingProfit: Number(adminShipProf.toFixed(2)), // 🌟 Now strictly 0 for Free
                            
//                             netPayableToSeller: Number(net.toFixed(2)),
//                             statusDate: order.updatedAt,
//                             deliveryDate: order.status === "Delivered" ? order.updatedAt : null,
//                             returnDate: isReturned ? order.updatedAt : null,
//                         });
//                     }
//                 });
//             }
//         });

//         // 🌟 ATOMIC DATABASE SYNC (Keeping your exact structure)
//         if (newPayoutRows.length > 0) {
//             if (settlement) {
//                 settlement.payoutBreakdown.push(...newPayoutRows);
//                 settlement.totalOrderCount += batchStats.count;
//                 settlement.totalSalesRevenue = Number((settlement.totalSalesRevenue + batchStats.sales).toFixed(2));
//                 settlement.totalPlatformCommission = Number((settlement.totalPlatformCommission + batchStats.comm).toFixed(2));
//                 settlement.totalGstOnCommission = Number((settlement.totalGstOnCommission + batchStats.gst).toFixed(2));
//                 settlement.totalTdsDeduction = Number((settlement.totalTdsDeduction + batchStats.tds).toFixed(2));
//                 settlement.totalSellerDeliveryDeduction = Number((settlement.totalSellerDeliveryDeduction + batchStats.delivDed).toFixed(2));
//                 settlement.totalLogisticsPartnerBill = Number((settlement.totalLogisticsPartnerBill + batchStats.partnerBill).toFixed(2));
//                 settlement.totalAdminDeliveryProfit = Number((settlement.totalAdminDeliveryProfit + batchStats.adminProf).toFixed(2));
//                 settlement.finalSettlementAmount = Number((settlement.finalSettlementAmount + batchStats.final).toFixed(2));
//             } else {
//                 settlement = new Settlement({
//                     sellerId, weekRange: `${startDate} to ${endDate}`,
//                     payoutBreakdown: newPayoutRows,
//                     totalOrderCount: batchStats.count,
//                     totalSalesRevenue: Number(batchStats.sales.toFixed(2)),
//                     totalPlatformCommission: Number(batchStats.comm.toFixed(2)),
//                     totalGstOnCommission: Number(batchStats.gst.toFixed(2)),
//                     totalTdsDeduction: Number(batchStats.tds.toFixed(2)),
//                     totalSellerDeliveryDeduction: Number(batchStats.delivDed.toFixed(2)),
//                     totalLogisticsPartnerBill: Number(batchStats.partnerBill.toFixed(2)),
//                     totalAdminDeliveryProfit: Number(batchStats.adminProf.toFixed(2)),
//                     finalSettlementAmount: Number(batchStats.final.toFixed(2))
//                 });
//             }
//             await settlement.save();
//             await Order.updateMany({ _id: { $in: orders.map(o => o._id) } }, { $set: { isSettled: true } });
//         }

//         const finalData = await Settlement.findById(settlement?._id || settlement).populate('sellerId', 'shopName email');
//         res.json({ success: true, message: "100% Mathematical Precision Sync! ✅", data: finalData });

//     } catch (err) {
//         console.error("Settlement Error:", err.message);
//         res.status(500).json({ success: false, error: err.message });
//     }
// };
// 🌟 1. GENERATE WEEKLY SETTLEMENT (Detailed Breakdown Sync)
// 🌟 1. GENERATE WEEKLY SETTLEMENT (Detailed Breakdown Sync)
// 🌟 1. GENERATE WEEKLY SETTLEMENT (Detailed Breakdown Sync)
exports.generateWeeklySettlement = async (req, res) => {
    try {
        const { sellerId, startDate, endDate } = req.body;
        const filterStart = new Date(startDate);
        filterStart.setHours(0, 0, 0, 0);
        const filterEnd = new Date(endDate);
        filterEnd.setHours(23, 59, 59, 999);

        const settings = (await FinanceSettings.findOne()) || { commissionPercent: 10, gstOnCommissionPercent: 18, tdsPercent: 2 };

        // 🚀 THE CRITICAL FETCH: 
        const orders = await Order.find({
            "sellerSplitData.sellerId": sellerId, 
            $or: [
                { status: "Delivered", isSettled: { $ne: true } }, 
                { status: "Returned" } 
            ],
            updatedAt: { $gte: filterStart, $lte: filterEnd }
        }).populate('items.productId');

        let settlement = await Settlement.findOne({ sellerId, weekRange: `${startDate} to ${endDate}` });

        if (!orders || orders.length === 0) {
            if (settlement) return res.json({ success: true, data: settlement });
            return res.status(404).json({ success: false, message: "No eligible orders found." });
        }

        let newPayoutRows = [];
        let batchStats = { sales: 0, comm: 0, gst: 0, tds: 0, delivDed: 0, partnerBill: 0, adminProf: 0, final: 0, count: 0 };

        orders.forEach((order) => {
            const split = order.sellerSplitData.find(s => s.sellerId.toString() === sellerId);
            if (split) {
                const isReturned = order.status === "Returned";
                const totalShippingChargedToCustomer = order.billDetails?.deliveryCharge || 0;
                const isPaidDelivery = totalShippingChargedToCustomer > 0;
                const realPartnerFee = Number(split.actualShippingCost || 0); 

                const sellerItems = order.items.filter(item => item.sellerId.toString() === sellerId);
                const sellerItemCount = sellerItems.length;

                sellerItems.forEach(p => {
                    const prodName = p.name || p.productId?.name || "Product";
                    
                    let existingRowIndex = -1;
                    if (settlement && settlement.payoutBreakdown) {
                        existingRowIndex = settlement.payoutBreakdown.findIndex(row => 
                            row.orderId.toString() === order._id.toString() && row.productName === prodName
                        );
                    }

                    if (settlement && existingRowIndex !== -1 && settlement.payoutBreakdown[existingRowIndex].type === order.status.toUpperCase()) {
                        return;
                    }

                    // 🔄 THE REVERSE SYNC: Old value-ah total-la irundhu katchithama subtract pannuvom
                    if (settlement && existingRowIndex !== -1 && settlement.payoutBreakdown[existingRowIndex].type === "DELIVERED" && isReturned) {
                        const oldRow = settlement.payoutBreakdown[existingRowIndex];
                        settlement.totalSalesRevenue -= oldRow.productPriceOnly;
                        settlement.totalPlatformCommission -= oldRow.platformCommission;
                        settlement.totalGstOnCommission -= oldRow.gstOnCommission;
                        settlement.totalTdsDeduction -= oldRow.tdsDeduction;
                        settlement.totalSellerDeliveryDeduction -= oldRow.sellerShippingDeduction;
                        settlement.totalLogisticsPartnerBill -= oldRow.logisticsPartnerCost;
                        settlement.totalAdminDeliveryProfit -= oldRow.adminShippingProfit;
                        settlement.finalSettlementAmount -= oldRow.netPayableToSeller;
                        settlement.totalOrderCount -= 1;
                    }

                    const productPrice = p.price * p.quantity;
                    let cAmt = 0, gAmt = 0, tAmt = 0, sDed = 0, adminShipProf = 0, net = 0;
                    
                    const dynamicLogisticsFee = isReturned ? (realPartnerFee * 2) : realPartnerFee;
                    const partnerSharePerItem = dynamicLogisticsFee / sellerItemCount;

                    if (order.status === "Delivered") {
                        cAmt = productPrice * (settings.commissionPercent / 100);
                        gAmt = cAmt * (settings.gstOnCommissionPercent / 100);
                        tAmt = productPrice * (settings.tdsPercent / 100);

                        if (isPaidDelivery) {
                            sDed = 0; 
                            adminShipProf = (totalShippingChargedToCustomer / sellerItemCount) - partnerSharePerItem;
                        } else {
                            sDed = partnerSharePerItem; 
                            adminShipProf = 0; 
                        }
                        net = productPrice - (cAmt + gAmt + tAmt + sDed);

                        batchStats.sales += productPrice;
                        batchStats.comm += cAmt;
                        batchStats.gst += gAmt;
                        batchStats.tds += tAmt;
                        batchStats.delivDed += sDed;
                        batchStats.partnerBill += partnerSharePerItem;
                        batchStats.adminProf += adminShipProf;
                        batchStats.final += net;
                    } else {
                        // 🛑 THE MASTER -258 MATH
                        const customerRefundPortion = productPrice + (totalShippingChargedToCustomer / sellerItemCount);
                        const totalLogisticsLiability = partnerSharePerItem; 
                        
                        net = -(customerRefundPortion + totalLogisticsLiability);

                        // 🌟 SYNC: SUMMARY LA MINUS AAGATHA MAARI ADD PANDROM
                        batchStats.sales += customerRefundPortion; 
                        batchStats.delivDed += totalLogisticsLiability;
                        batchStats.partnerBill += totalLogisticsLiability;
                        batchStats.final += net;
                    }

                    batchStats.count++;

                    const rowData = {
                        orderId: order._id,
                        productName: prodName,
                        type: order.status.toUpperCase(),
                        customerPaidTotal: Number((productPrice + (totalShippingChargedToCustomer / sellerItemCount)).toFixed(2)),
                        productPriceOnly: productPrice,
                        platformCommission: Number(cAmt.toFixed(2)),
                        gstOnCommission: Number(gAmt.toFixed(2)),
                        tdsDeduction: Number(tAmt.toFixed(2)),
                        shippingType: isPaidDelivery ? "PAID" : "FREE",
                        sellerShippingDeduction: Number((isReturned ? partnerSharePerItem : sDed).toFixed(2)),
                        logisticsPartnerCost: Number(partnerSharePerItem.toFixed(2)),
                        adminShippingProfit: Number(adminShipProf.toFixed(2)), 
                        netPayableToSeller: Number(net.toFixed(2)),
                        statusDate: order.updatedAt,
                        deliveryDate: order.status === "Delivered" ? order.updatedAt : null,
                        returnDate: isReturned ? order.updatedAt : null,
                    };

                    if (settlement && existingRowIndex !== -1) {
                        settlement.payoutBreakdown[existingRowIndex] = rowData;
                    } else {
                        newPayoutRows.push(rowData);
                    }
                });
            }
        });

        // 🌟 ATOMIC DATABASE SYNC (Addition Only Flow)
        if (newPayoutRows.length > 0 || batchStats.count > 0) {
            if (settlement) {
                if(newPayoutRows.length > 0) settlement.payoutBreakdown.push(...newPayoutRows);
                settlement.totalOrderCount += batchStats.count;
                settlement.totalSalesRevenue = Number((settlement.totalSalesRevenue + batchStats.sales).toFixed(2));
                settlement.totalPlatformCommission = Number((settlement.totalPlatformCommission + batchStats.comm).toFixed(2));
                settlement.totalGstOnCommission = Number((settlement.totalGstOnCommission + batchStats.gst).toFixed(2));
                settlement.totalTdsDeduction = Number((settlement.totalTdsDeduction + batchStats.tds).toFixed(2));
                settlement.totalSellerDeliveryDeduction = Number((settlement.totalSellerDeliveryDeduction + batchStats.delivDed).toFixed(2));
                settlement.totalLogisticsPartnerBill = Number((settlement.totalLogisticsPartnerBill + batchStats.partnerBill).toFixed(2));
                settlement.totalAdminDeliveryProfit = Number((settlement.totalAdminDeliveryProfit + batchStats.adminProf).toFixed(2));
                settlement.finalSettlementAmount = Number((settlement.finalSettlementAmount + batchStats.final).toFixed(2));
            } else {
                settlement = new Settlement({
                    sellerId, weekRange: `${startDate} to ${endDate}`,
                    payoutBreakdown: newPayoutRows,
                    totalOrderCount: batchStats.count,
                    totalSalesRevenue: Number(batchStats.sales.toFixed(2)),
                    totalPlatformCommission: Number(batchStats.comm.toFixed(2)),
                    totalGstOnCommission: Number(batchStats.gst.toFixed(2)),
                    totalTdsDeduction: Number(batchStats.tds.toFixed(2)),
                    totalSellerDeliveryDeduction: Number(batchStats.delivDed.toFixed(2)),
                    totalLogisticsPartnerBill: Number(batchStats.partnerBill.toFixed(2)),
                    totalAdminDeliveryProfit: Number(batchStats.adminProf.toFixed(2)),
                    finalSettlementAmount: Number(batchStats.final.toFixed(2))
                });
            }
            await settlement.save();
            const deliveredOrderIds = orders.filter(o => o.status === "Delivered").map(o => o._id);
            if(deliveredOrderIds.length > 0) {
                await Order.updateMany({ _id: { $in: deliveredOrderIds } }, { $set: { isSettled: true } });
            }
        }

        const finalData = await Settlement.findById(settlement?._id || settlement).populate('sellerId', 'shopName email');
        res.json({ success: true, message: "1Cr Scalable Precision Sync Complete! ✅", data: finalData });

    } catch (err) {
        console.error("Settlement Error:", err.message);
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

/* =====================================================
    🌟 GET SETTLEMENT BREAKDOWN DETAILS (For Seller View)
    Purpose: To show the detailed itemized list of orders inside a Paid Settlement
===================================================== */
exports.getSettlementBreakdown = async (req, res) => {
    try {
        const { settlementId } = req.params;

        // 1. Fetch the specific settlement
        const settlement = await Settlement.findById(settlementId);

        if (!settlement) {
            return res.status(404).json({ success: false, message: "Settlement not found" });
        }

        // 2. We only want to show this detailed data if the settlement is PAID (or you can remove this check if you want them to see pending ones too)
        if (settlement.status !== "Paid") {
            return res.status(400).json({ success: false, message: "Details are available only for Paid settlements." });
        }

        // 3. Map and format the exact fields you requested
        const formattedBreakdown = settlement.payoutBreakdown.map((row) => {
            // Calculate Commission + GST together
            const totalCommissionAndGST = (row.platformCommission || 0) + (row.gstOnCommission || 0);

            return {
                orderId: row.orderId,
                productName: row.productName,
                status: row.type, // e.g., DELIVERED, RETURNED
                orderDate: row.deliveryDate || row.statusDate, // Best date representing the action
                statusDate: row.statusDate,
                
                // Money Matters
                totalCustomerPaid: row.customerPaidTotal || 0,
                productAmountOnly: row.productPriceOnly || 0,
                commissionAndGst: Number(totalCommissionAndGST.toFixed(2)),
                deliveryDeduction: row.sellerShippingDeduction || 0,
                finalShare: row.netPayableToSeller || 0
            };
        });

        res.json({
            success: true,
            settlementPeriod: settlement.weekRange,
            paymentDate: settlement.paymentDate,
            totalSettledAmount: settlement.finalSettlementAmount,
            data: formattedBreakdown
        });

    } catch (err) {
        console.error("Settlement Breakdown Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};