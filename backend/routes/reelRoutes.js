const express = require('express');
const router = express.Router();
const reelCtrl = require('../controllers/reelController');
const upload = require('../utils/upload'); 
const { protect, optionalProtect } = require('../middleware/authMiddleware'); // 🌟 optionalProtect தேவை

// 🌟 மிக முக்கியமானது: optionalProtect சேர்த்தால்தான் லாக்-இன் செய்தவர்களுக்கு சிவப்பு நிறம் வரும்
// லாக்-இன் செய்யாதவர்களுக்கும் ரீல்ஸ் தெரியும்.
router.get('/', optionalProtect || protect, reelCtrl.getAllReels); 

router.post('/upload', protect, upload.single('video'), reelCtrl.uploadReel);
router.delete('/:id', protect, reelCtrl.deleteReel);

// லைக் செய்ய லாக்-இன் கண்டிப்பா வேணும்
router.post('/like/:id', protect, reelCtrl.toggleLike); 
router.post('/report', reelCtrl.reportReel);

module.exports = router;