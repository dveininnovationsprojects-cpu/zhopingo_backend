const express = require('express');
const router = express.Router();
const reelCtrl = require('../controllers/reelController');

// 🔥 THE FIX: Product-ku use pannura adhey sariyaana multer config-ai ingayum use pannu
const { upload } = require('../middleware/multerConfig'); 
const { protect, optionalProtect } = require('../middleware/authMiddleware'); 

router.get('/', optionalProtect, reelCtrl.getAllReels);


// 🔥 THE FIX: upload.single('video') mattum podhum
router.post('/upload', protect, upload.single('video'), reelCtrl.uploadReel);

router.delete('/:id', protect, reelCtrl.deleteReel);
router.post('/like/:id', protect, reelCtrl.toggleLike); 
router.post('/report', protect, reelCtrl.reportReel);
router.post('/view/:id', protect, reelCtrl.addReelView);


// Admin reports-ai fetch panna (Admin dashboard-kaaga)
router.get('/admin/reports', protect, reelCtrl.getReportedReels);

module.exports = router;