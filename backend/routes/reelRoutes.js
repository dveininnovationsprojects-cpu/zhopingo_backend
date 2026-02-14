const express = require('express');
const router = express.Router();
const reelCtrl = require('../controllers/reelController');
const upload = require('../utils/upload'); 
const { protect, optionalProtect } = require('../middleware/authMiddleware'); 

router.get('/', optionalProtect, reelCtrl.getAllReels);

router.post('/upload', protect, upload.single('video'), reelCtrl.uploadReel);
router.delete('/:id', protect, reelCtrl.deleteReel);


router.post('/like/:id', protect, reelCtrl.toggleLike); 
router.post('/report', protect, reelCtrl.reportReel);

module.exports = router;