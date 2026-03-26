const DeliveryCharge = require('../models/DeliveryCharge');
const Seller = require("../models/Seller");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendReelBlockNotification } = require("../utils/emailService");
const bcrypt = require("bcryptjs");
const FinanceSettings = require('../models/FinanceSettings');
const Settlement = require('../models/Settlement');
const WeightSlab = require('../models/WeightSlab');
const Order = require('../models/Order');
const mongoose = require('mongoose');


const JWT_SECRET = process.env.JWT_SECRET || "secret123";

exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const DEFAULT_EMAIL = "admin@gmail.com";
        const DEFAULT_PASS = "admin@123";

        if (email === DEFAULT_EMAIL && password === DEFAULT_PASS) {
            // 1. அட்மின் இருக்காரான்னு பாரு
            let admin = await User.findOne({ role: 'admin' });

            if (!admin) {
                // 2. ஒருவேளை அதே போன் நம்பர்ல கஸ்டமர் இருந்தா, அந்த 'unique' எர்ரரை தவிர்க்க
                // தற்காலிகமா அட்மினுக்கு வேற ஒரு நம்பர் கொடுத்துட்டு, அப்புறம் நீ ப்ரொபைல்ல மாத்திக்கலாம்.
                // அல்லது, டேட்டாபேஸ்ல 'Admin'னு ஒருத்தரை மட்டும் மேனுவலா கிரியேட் பண்ணிடு.
                
                admin = new User({
                    name: "Admin da amala",
                    email: DEFAULT_EMAIL,
                    password: DEFAULT_PASS,
                    role: "admin",
                    phone: "0000000000" // 👈 இத முதல்ல குடு, அப்புறம் அப்டேட் பண்ணிக்கலாம்
                });
                await admin.save();
            }

            const token = jwt.sign(
                { id: admin._id, role: "admin" },
                JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.json({
                success: true,
                token,
                user: admin
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
    const operations = ratesArray.map(item => ({
      updateOne: {
        filter: { pincode: item.pincode },
        update: { $set: { charge: item.charge } },
        upsert: true
      }
    }));
    await DeliveryCharge.bulkWrite(operations);
    res.json({ success: true, message: "Delivery rates updated successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};


exports.getAllSellers = async (req, res) => {
  try {
    const sellers = await Seller.find().sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      count: sellers.length,
      data: sellers 
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
    seller.isVerified = (status === "approved");
    
    if (reason) seller.rejectionReason = reason;

    await seller.save();

    res.json({ 
      success: true, 
      message: `Seller has been ${status} successfully`,
      sellerData: seller 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    
    const customers = await User.find({ role: 'customer' })
      .select("-password") 
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "can't get customer info",
      error: err.message 
    });
  }
};



exports.toggleBrandStatus = async (req, res) => {
    try {
        const seller = await Seller.findById(req.params.id);
        if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });

        seller.isBrand = !seller.isBrand; 
        await seller.save();

        res.json({ success: true, message: `Brand status updated to ${seller.isBrand}`, isBrand: seller.isBrand });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.blockReelByAdmin = async (req, res) => {
  try {
    const { reelId, reason } = req.body;


    const reel = await Reel.findById(reelId).populate("sellerId");
    if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });

   
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

    res.json({ success: true, message: "Reel blocked and seller notified via email" });
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
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    seller.status = status;
    await seller.save();

    res.json({ 
      success: true, 
      message: `Seller is now ${status.toUpperCase()}`, 
      data: seller 
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
            { new: true, runValidators: true }
        ).select("-password");

        res.json({ success: true, message: "Profile Updated!", data: updatedAdmin });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
// 3️⃣ அட்மின் ப்ரொபைல் விவரங்களை எடுக்க
exports.getAdminProfile = async (req, res) => {
    try {
        const admin = await User.findById(req.user.id).select("-password");
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
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
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

        // 2. பழைய பாஸ்வேர்ட் மேட்ச் ஆகிறதா எனப் பார்
        const isMatch = await bcrypt.compare(oldPassword, admin.password);
        
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Old password is wrong" });
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
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateFinanceSettings = async (req, res) => {
    try {
        const settings = await FinanceSettings.findOneAndUpdate({}, req.body, { upsert: true, new: true });
        res.json({ success: true, message: "Finance Settings Updated!", data: settings });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
/* =====================================================
    💰 MASTER WEEKLY SETTLEMENT GENERATOR 
    (Maggie-Rice Sync & Nested Array Date Logic)
===================================================== */
exports.generateWeeklySettlement = async (req, res) => {
    try {
        const { sellerId, startDate, endDate } = req.body;
        const filterStart = new Date(startDate);
        const filterEnd = new Date(endDate);
        filterEnd.setHours(23, 59, 59, 999);

        // 1️⃣ Fetch DELIVERED orders strictly within the Frontend's week range
        // 🌟 Fix: Querying nested deliveredDate inside sellerSplitData array
        const deliveredOrders = await Order.find({
            status: 'Delivered',
            isSettled: { $ne: true },
            sellerSplitData: {
                $elemMatch: {
                    sellerId: new mongoose.Types.ObjectId(sellerId),
                    packageStatus: 'Delivered',
                    deliveredDate: { $gte: filterStart, $lte: filterEnd }
                }
            }
        }).populate('items.productId');

        // 2️⃣ Fetch RETURNED orders within the same week range
        // 🌟 Fix: Querying nested returnDate inside sellerSplitData array
        const returnedOrders = await Order.find({
            status: 'Returned',
            isSettled: { $ne: true },
            sellerSplitData: {
                $elemMatch: {
                    sellerId: new mongoose.Types.ObjectId(sellerId),
                    // status 'Returned' na returnDate kandippa irukanum
                    returnDate: { $gte: filterStart, $lte: filterEnd }
                }
            }
        }).populate('items.productId');

        if (deliveredOrders.length === 0 && returnedOrders.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: `No eligible orders found between ${startDate} and ${endDate}.` 
            });
        }

        let payoutRows = []; 
        let summary = { sales: 0, deductions: 0, finalPayable: 0 };

        // Process Orders Logic (Processing Delivered & Returned)
        const processOrders = (orders, type) => {
            orders.forEach(order => {
                const sellerData = order.sellerSplitData.find(s => s.sellerId.toString() === sellerId);
                if (sellerData) {
                    const subtotal = sellerData.sellerSubtotal || 0;
                    const comm = sellerData.commissionTotal || 0;
                    const gst = sellerData.gstTotal || 0;
                    const tds = sellerData.tdsTotal || 0;
                    const delDed = sellerData.deliveryDeduction || 0;
                    const shipCost = sellerData.actualShippingCost || 80;

                    if (type === 'SALE') {
                        const totalDed = comm + gst + tds + delDed;
                        summary.sales += subtotal;
                        summary.deductions += totalDed;
                        payoutRows.push({
                            date: sellerData.deliveredDate, // 🌟 UI sync
                            orderId: order._id,
                            type: 'SALE',
                            amount: subtotal,
                            comm_gst_tds: comm + gst,
                            delivery_status: delDed > 0 ? "Deducted" : "FREE",
                            net_payable: subtotal - totalDed
                        });
                    } else {
                        const alreadyDeducted = comm + gst;
                        const totalReturnDeduction = (subtotal + shipCost) - alreadyDeducted;
                        summary.sales -= subtotal;
                        summary.deductions += (shipCost - alreadyDeducted);
                        payoutRows.push({
                            date: sellerData.returnDate, // 🌟 UI sync
                            orderId: order._id,
                            type: 'RETURN',
                            amount: -subtotal,
                            comm_gst_tds: -alreadyDeducted,
                            delivery_status: `Loss (₹${shipCost})`,
                            net_payable: -totalReturnDeduction
                        });
                    }
                }
            });
        };

        processOrders(deliveredOrders, 'SALE');
        processOrders(returnedOrders, 'RETURN');

        summary.finalPayable = summary.sales - summary.deductions;

        const newSettlement = new Settlement({
            sellerId,
            weekRange: `${startDate} to ${endDate}`,
            payoutBreakdown: payoutRows,
            totalSales: summary.sales,
            totalDeductions: summary.deductions,
            finalPayable: summary.finalPayable,
            status: 'Pending'
        });

        await newSettlement.save();

        const orderIds = [...deliveredOrders, ...returnedOrders].map(o => o._id);
        await Order.updateMany({ _id: { $in: orderIds } }, { $set: { isSettled: true } });

        res.json({ success: true, message: "Weekly Settlement Generated! ✅", data: newSettlement });

    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};
// 3. Mark as Paid (🌟 Strictly Button Click - No Body Needed)
exports.markSettlementAsPaid = async (req, res) => {
    try {
        const { id } = req.params; 
        
        // 1. Find settlement
        const settlement = await Settlement.findById(id);
        if (!settlement) return res.status(404).json({ success: false, message: "Settlement not found" });
        
        // 2. Already paid check
        if (settlement.status === 'Paid') {
            return res.status(400).json({ success: false, message: "Already marked as PAID" });
        }

        // 🌟 CHANGE: No destructuring from req.body anymore!
        settlement.status = 'Paid';
        settlement.paymentDate = new Date(); 
        
        await settlement.save();

        // 🚀 SYNC: Update Seller Ledger & Dashboard
        // Internal function call reference fix
        if (exports.createLedgerEntryForPayout) {
            await exports.createLedgerEntryForPayout(settlement.sellerId, settlement.finalPayable);
        }

        res.json({ 
            success: true, 
            message: "Payment Success! Status changed to PAID ✅", 
            data: settlement 
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
            status: 'Delivered',
            isSettled: { $ne: true } // 👈 Settle aagaadha orders mattum
        }).sort({ createdAt: 1 });

        res.json({ success: true, data: orders });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 🚚 Global Logistics Settlement (Bulk Pay for Delivery Team)
exports.generateGlobalLogisticsSettlement = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        // 1. Intha range-la irukkura ELLA Delivered orders-aiyum fetch panroam
        const orders = await Order.find({
            status: 'Delivered',
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        });

        if (orders.length === 0) return res.status(404).json({ success: false, message: "No delivered orders found." });

        let stats = {
            orderCount: 0,
            customerPaidTotal: 0,
            actualPartnerCost: 0
        };

        orders.forEach(order => {
            stats.orderCount++;
            // Customer pay panna delivery charge (Total bill-la irundhu)
            stats.customerPaidTotal += order.billDetails?.deliveryCharge || 0;

            // Intha order-la irukkura ella packages-oda actual shipping cost-ah kootuvom
            order.sellerSplitData.forEach(split => {
                stats.actualPartnerCost += split.actualLogisticsCost || 45; // Staging fallback
            });
        });

        const newLogisticsBill = new LogisticsSettlement({
            weekRange: `${startDate} to ${endDate}`,
            totalOrders: stats.orderCount,
            totalCustomerPaidDelivery: stats.customerPaidTotal,
            totalPayableToLogistics: stats.actualPartnerCost,
            netAdminLogisticsProfit: stats.customerPaidTotal - stats.actualPartnerCost,
            status: 'Pending'
        });

        await newLogisticsBill.save();

        res.json({ 
            success: true, 
            message: "Global Logistics Bill Generated!", 
            data: newLogisticsBill 
        });

    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. WEIGHT SLABS (For Admin reference & Manual Override if API fails)
exports.manageWeightSlabs = async (req, res) => {
    try {
        const slabs = await WeightSlab.find();
        res.json({ success: true, data: slabs });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// Add or Update Weight Slab
exports.upsertWeightSlab = async (req, res) => {
    try {
        const { label, minWeight, maxWeight, rate } = req.body;
        const slab = await WeightSlab.findOneAndUpdate(
            { label }, 
            { minWeight, maxWeight, rate }, 
            { upsert: true, new: true }
        );
        res.json({ success: true, message: "Weight slab updated!", data: slab });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// Delete Slab
exports.deleteWeightSlab = async (req, res) => {
    try {
        await WeightSlab.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Slab removed!" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getAllSettlements = async (req, res) => {
    try {
        const settlements = await Settlement.find()
            .populate('sellerId', 'shopName email') // 🌟 Seller name theriya populate panrom
            .sort({ createdAt: -1 }); // Latest settlement top-la vara

        res.json({
            success: true,
            count: settlements.length,
            data: settlements
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


const Ledger = require('../models/Ledger');

// 🌟 logic A: Get All Ledger Entries for Admin View
exports.getAllLedgerEntries = async (req, res) => {
    try {
        const entries = await Ledger.find()
            .populate('sellerId', 'shopName')
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
        const lastEntry = await Ledger.findOne({ sellerId }).sort({ createdAt: -1 });
        const currentBalance = lastEntry ? lastEntry.balance : 0;

        // 2. New balance calculation: Last Balance + Current Credit
        const newEntry = new Ledger({
            sellerId,
            orderId,
            type: 'Order_Sale',
            credit: amount,
            balance: currentBalance + amount,
            description: `Credit for Order #${orderId.toString().slice(-6)}`
        });
        await newEntry.save();
    } catch (err) { console.error("Ledger Credit Error:", err.message); }
};

// 🚀 Logic C: Auto-Entry when Payout is Paid (Call this inside markSettlementAsPaid)
exports.createLedgerEntryForPayout = async (sellerId, amount) => {
    try {
        const lastEntry = await Ledger.findOne({ sellerId }).sort({ createdAt: -1 });
        const currentBalance = lastEntry ? lastEntry.balance : 0;

        // Formula: Last Balance - Current Debit
        const newEntry = new Ledger({
            sellerId,
            type: 'Weekly_Payout',
            debit: amount,
            balance: currentBalance - amount,
            description: `Weekly payout processed`
        });
        await newEntry.save();
    } catch (err) { console.error("Ledger Debit Error:", err.message); }
};

// 🌟 41. Fetch specific seller settlements for auto-sync logic
exports.getSellerSettlements = async (req, res) => {
    try {
        const data = await Settlement.find({ sellerId: req.params.sellerId }).sort({ createdAt: -1 });
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.getSellerLedger = async (req, res) => {
    try {
        const data = await Ledger.find({ sellerId: req.params.sellerId }).sort({ createdAt: -1 });
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};