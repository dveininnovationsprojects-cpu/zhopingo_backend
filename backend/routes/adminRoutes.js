const express = require('express');
const router = express.Router();
const DeliveryCharge = require('../models/DeliveryCharge');

router.post('/bulk-upload-pincodes', async (req, res) => {
    try {
        const operations = req.body.map(item => ({
            updateOne: {
                filter: { pincode: item.pincode },
                update: { $set: { charge: item.charge } },
                upsert: true
            }
        }));
        await DeliveryCharge.bulkWrite(operations);
        res.json({ success: true, message: "Updated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;