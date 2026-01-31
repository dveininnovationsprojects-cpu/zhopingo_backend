
const Reel = require('../models/Reel');

exports.uploadReel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Please upload a video file" });

        
        let productId = req.body.productId;
        
       
        if (!productId || productId === 'null' || productId === '') {
            productId = null;
        }

        const newReel = new Reel({
            sellerId: req.body.sellerId,
            productId: productId,
            description: req.body.description,
            videoUrl: req.file.filename 
        });

        const savedReel = await newReel.save();
        
       
        const populatedReel = await Reel.findById(savedReel._id)
            .populate('productId')
            .populate('sellerId', 'name shopName');

        const fullUrl = `${req.protocol}://${req.get('host')}/uploads/${populatedReel.videoUrl}`;

        res.status(201).json({ 
            success: true, 
            data: { ...populatedReel._doc, videoUrl: fullUrl } 
        });
    } catch (err) { 
        res.status(400).json({ error: err.message }); 
    }
};
exports.getAllReels = async (req, res) => {
    try {
        
        const reels = await Reel.find()
            .populate('productId')
            .populate('sellerId', 'name shopName') 
            .sort({ createdAt: -1 });

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
        const reelsWithFullUrl = reels.map(reel => ({
            ...reel._doc,
            videoUrl: baseUrl + reel.videoUrl
        }));

        res.json({ success: true, data: reelsWithFullUrl });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

exports.toggleLike = async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);
        const userId = req.user.id; 

        const isLiked = reel.likedBy.includes(userId);
        if (isLiked) {
            reel.likes -= 1;
            reel.likedBy = reel.likedBy.filter(id => id.toString() !== userId);
        } else {
            reel.likes += 1;
            reel.likedBy.push(userId);
        }
        await reel.save();
        res.json({ success: true, likes: reel.likes, isLiked: !isLiked });
    } catch (err) { res.status(500).json({ error: err.message }); }
};


exports.reportReel = async (req, res) => {
    try {
        const { reelId, reason } = req.body;
        
        console.log(`Reel ${reelId} reported for: ${reason}`);
        res.json({ success: true, message: "Report submitted successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateReel = async (req, res) => {
    try {
        const updatedReel = await Reel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updatedReel });
    } catch (err) { res.status(400).json({ error: err.message }); }
};


exports.deleteReel = async (req, res) => {
    try {
        await Reel.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Reel deleted successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};