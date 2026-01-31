const DeliveryCharge = require('../models/DeliveryCharge');

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