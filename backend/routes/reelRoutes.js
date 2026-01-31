const express = require('express');
const router = express.Router();
const reelCtrl = require('../controllers/reelController');
const upload = require('../utils/upload'); 
const { protect } = require('../middleware/authMiddleware');

router.get('/', reelCtrl.getAllReels); 
router.post('/upload', upload.single('video'), reelCtrl.uploadReel); 
router.post('/like/:id', protect, reelCtrl.toggleLike); 
router.post('/report', reelCtrl.reportReel);
router.delete('/:id', reelCtrl.deleteReel); 

module.exports = router;