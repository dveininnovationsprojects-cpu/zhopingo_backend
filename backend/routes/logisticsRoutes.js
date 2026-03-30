const express = require('express');
const router = express.Router();
const logisticsController = require('../controllers/logisticsController');

/* =====================================================
    🚚 ZHOPINGO LOGISTICS & TRACKING ROUTES
===================================================== */

// 📍 LIVE RATE CALCULATION (Frontend Cart Screen call panradhu idhu dhaan)
// Route: /api/v1/logistics/calculate-shipping
router.post('/calculate-shipping', logisticsController.calculateLiveDeliveryRate);

// 📍 SERVICEABILITY
// Check if Delhivery delivers to this pincode (Hits Delhivery API)
router.get('/check-serviceability', logisticsController.checkServiceability);

// 📦 SHIPMENT CREATION
// Generate AWB and link to Order (Internal & Admin use)
router.post('/create-shipment', logisticsController.processShipmentCreation);

// 📈 REAL-TIME TRACKING
// Get full scan history and current status from Delhivery
router.get('/track/:awb', logisticsController.trackOrder);

// 📄 SHIPPING LABEL
// Get PDF link to print the package label
router.get('/download-label/:awb', logisticsController.downloadShippingLabel);

// 📈 WEBHOOK (Delhivery Automatic Updates)
// Strictly for Delhivery server to push status changes to our DB
router.post('/webhook/delhivery', logisticsController.handleDelhiveryWebhook);

module.exports = router;