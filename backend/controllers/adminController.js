const DeliveryCharge = require('../models/DeliveryCharge');
const Seller = require("../models/Seller");

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
    res.json({ success: true, data: sellers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 2. செலர் நிலையை மாற்றுதல் (Approve/Reject)
exports.verifySellerStatus = async (req, res) => {
  try {
    const { sellerId, status, reason } = req.body; 

    const seller = await Seller.findById(sellerId);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    seller.kycStatus = status; // "approved" or "rejected"
    seller.isVerified = (status === "approved");
    if (reason) seller.rejectionReason = reason;

    await seller.save();
    res.json({ success: true, message: `Seller has been ${status} successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};