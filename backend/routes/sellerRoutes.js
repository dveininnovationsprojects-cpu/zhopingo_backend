const express = require('express');
const router = express.Router();
const sellerCtrl = require('../controllers/sellerController');


router.get('/stats/:sellerId', sellerCtrl.getDashboardStats); 
router.get('/inventory/:sellerId', sellerCtrl.getInventory);

module.exports = router;