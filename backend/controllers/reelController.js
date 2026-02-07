
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
    const userId = req.user?._id;

    const reels = await Reel.find({ isBlocked: false })
      .populate('sellerId', 'shopName')
      .sort({ createdAt: -1 });

    const formatted = reels.map(reel => ({
      _id: reel._id,
      videoUrl: reel.videoUrl,
      description: reel.description,
      sellerId: reel.sellerId,
      productId: reel.productId,
      shares: reel.shares,
      likes: reel.likedBy.length, // 👈 derived
      isLiked: userId
        ? reel.likedBy.some(id => id.toString() === userId.toString())
        : false
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ success: false, message: "Reel not found" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id); // 🔥 CRITICAL FIX

    const index = reel.likedBy.findIndex(
      id => id.toString() === userId.toString()
    );

    let isLiked;

    if (index === -1) {
      reel.likedBy.push(userId);
      isLiked = true;
    } else {
      reel.likedBy.splice(index, 1);
      isLiked = false;
    }

    await reel.save();

    res.json({
      success: true,
      likes: reel.likedBy.length,
      isLiked
    });
  } catch (err) {
    console.error("LIKE ERROR:", err); // 👈 will now be clean
    res.status(500).json({ success: false, message: err.message });
  }
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