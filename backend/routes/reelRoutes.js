const express = require('express');
const router = express.Router();
const reelCtrl = require('../controllers/reelController');
const upload = require('../utils/upload'); 
const { protect } = require('../middleware/authMiddleware');

// routes/reelRoutes.js
// 🌟 protect சேர்த்தால் தான் isLiked வேலை செய்யும்
// 🌟 ஒருவேளை Reels லோடு ஆகவில்லை என்றால் 'protect' ஐ நீக்கிவிட்டு செக் செய்யவும்
router.get('/', reelCtrl.getAllReels);
router.post('/upload', protect, upload.single('video'), reelCtrl.uploadReel);
router.delete('/:id', protect, reelCtrl.deleteReel);

router.post('/like/:id', protect, reelCtrl.toggleLike); ////
router.post('/report', reelCtrl.reportReel);


module.exports = router;