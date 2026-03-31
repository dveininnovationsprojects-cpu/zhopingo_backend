// const express = require('express');
// const router = express.Router();
// const logisticsController = require('../controllers/logisticsController');

// /* =====================================================
//     🚚 ZHOPINGO LOGISTICS & TRACKING ROUTES
// ===================================================== */

// // 📍 LIVE RATE CALCULATION (Frontend Cart Screen call panradhu idhu dhaan)
// // Route: /api/v1/logistics/calculate-shipping
// router.post('/calculate-shipping', logisticsController.calculateLiveDeliveryRate);

// // 📍 SERVICEABILITY
// // Check if Delhivery delivers to this pincode (Hits Delhivery API)
// router.get('/check-serviceability', logisticsController.checkServiceability);

// // 📦 SHIPMENT CREATION
// // Generate AWB and link to Order (Internal & Admin use)
// router.post('/create-shipment', logisticsController.processShipmentCreation);

// // 📈 REAL-TIME TRACKING
// // Get full scan history and current status from Delhivery
// router.get('/track/:awb', logisticsController.trackOrder);

// // 📄 SHIPPING LABEL
// // Get PDF link to print the package label
// router.get('/download-label/:awb', logisticsController.downloadShippingLabel);

// // 📈 WEBHOOK (Delhivery Automatic Updates)
// // Strictly for Delhivery server to push status changes to our DB
// router.post('/webhook/delhivery', logisticsController.handleDelhiveryWebhook);

// module.exports = router;


const express = require('express');
const router = express.Router();
const logisticsController = require('../controllers/logisticsController');
const { protect } = require('../middleware/authMiddleware'); // Middleware import

/* =====================================================
    🚚 ZHOPINGO LOGISTICS ROUTES (Protected)
===================================================== */

// 📍 Public/General Checks (Optional to protect, but better for API cost)
router.get('/check-serviceability', logisticsController.checkServiceability);

// 📍 Calculation & Tracking (Strictly Protected)
router.post('/calculate-shipping', protect, logisticsController.calculateLiveDeliveryRate);
router.get('/track/:awb', protect, logisticsController.trackOrder);
router.get('/download-label/:awb', protect, logisticsController.downloadShippingLabel);

// 📦 Internal/Admin (Should be protected or internal only)
router.post('/create-shipment', protect, logisticsController.processShipmentCreation);

// 📈 Webhook (STRICTLY NO PROTECT - Delhivery needs open access)
router.post('/webhook/delhivery', logisticsController.handleDelhiveryWebhook);

// logisticsRoutes.js kulla indha line-ah add pannu

// 📍 MANUAL WAREHOUSE REGISTRATION (Dashboard-la varaadha seller-ku idha hit pannanum)
router.post('/register-warehouse', logisticsController.manualRegisterWarehouse);

module.exports = router;