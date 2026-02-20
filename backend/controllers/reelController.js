
// const Reel = require('../models/Reel');
// const mongoose = require('mongoose');

// exports.uploadReel = async (req, res) => {
//     try {
//         if (!req.file) return res.status(400).json({ error: "Please upload a video file" });

        
//         let productId = req.body.productId;
        
       
//         if (!productId || productId === 'null' || productId === '') {
//             productId = null;
//         }

//         const newReel = new Reel({
//             sellerId: req.body.sellerId,
//             productId: productId,
//             description: req.body.description,
//             videoUrl: req.file.filename 
//         });

//         const savedReel = await newReel.save();
        
       
//         const populatedReel = await Reel.findById(savedReel._id)
//             .populate('productId')
//             .populate('sellerId', 'name shopName');

//         const fullUrl = `${req.protocol}://${req.get('host')}/uploads/${populatedReel.videoUrl}`;

//         res.status(201).json({ 
//             success: true, 
//             data: { ...populatedReel._doc, videoUrl: fullUrl } 
//         });
//     } catch (err) { 
//         res.status(400).json({ error: err.message }); 
//     }
// };
// exports.getAllReels = async (req, res) => {
//   try {
//     // 🌟 req.user இல்லை என்றாலும் எரர் வராது, null என எடுத்துக்கொள்ளும்
//     const userId = req.user ? (req.user.id || req.user._id) : null; 
//     const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;

//     const reels = await Reel.find({ isBlocked: false })
//       .populate('sellerId', 'shopName')
//       .populate('productId')
//       .sort({ createdAt: -1 });

//     const formatted = reels.map(reel => ({
//       ...reel._doc,
//       videoUrl: baseUrl + reel.videoUrl,
//       likes: reel.likedBy ? reel.likedBy.length : 0,
//       // 🌟 யூசர் லாக்-இன் செய்திருந்தால் மட்டுமே isLiked செக் செய்யும்
//       isLiked: (userId && reel.likedBy) ? reel.likedBy.some(id => id.toString() === userId.toString()) : false
//     }));

//     res.json({ success: true, data: formatted });
//   } catch (err) {
//     console.error("GET REELS ERROR:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
// exports.toggleLike = async (req, res) => {
//   try {
//     // 🌟 லாக்-இன் செய்யவில்லை என்றால் 401 எரர் காட்டும்
//     if (!req.user) return res.status(401).json({ success: false, message: "Please login to like" });

//     const userId = req.user.id || req.user._id;
//     const reel = await Reel.findById(req.params.id);

//     if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });

//     const userObjectId = new mongoose.Types.ObjectId(userId);
//     const index = reel.likedBy.findIndex(id => id.toString() === userObjectId.toString());

//     let isLiked;
//     if (index === -1) {
//       reel.likedBy.push(userObjectId);
//       isLiked = true;
//     } else {
//       reel.likedBy.splice(index, 1);
//       isLiked = false;
//     }

//     await reel.save();
//     res.json({ success: true, likes: reel.likedBy.length, isLiked });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.reportReel = async (req, res) => {
//     try {
//         const { reelId, reason } = req.body;
        
//         console.log(`Reel ${reelId} reported for: ${reason}`);
//         res.json({ success: true, message: "Report submitted successfully" });
//     } catch (err) { res.status(500).json({ error: err.message }); }
// };

// exports.updateReel = async (req, res) => {
//     try {
//         const updatedReel = await Reel.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         res.json({ success: true, data: updatedReel });
//     } catch (err) { res.status(400).json({ error: err.message }); }
// };


// exports.deleteReel = async (req, res) => {
//     try {
//         await Reel.findByIdAndDelete(req.params.id);
//         res.json({ success: true, message: "Reel deleted successfully" });
//     } catch (err) { res.status(500).json({ error: err.message }); }
// };



// controllers/reelController.js
const Reel = require('../models/Reel');
const mongoose = require('mongoose');

exports.uploadReel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "Please upload a video file" });
    }

    let productId = req.body.productId;

    // productId optional – normalize null-like values
    if (!productId || productId === 'null' || productId === '') {
      productId = null;
    }

    const newReel = new Reel({
      sellerId: req.body.sellerId,
      productId: productId,
      description: req.body.description,
      videoUrl: req.file.filename, // stored filename
    });

    const savedReel = await newReel.save();

    const populatedReel = await Reel.findById(savedReel._id)
      .populate('productId')
      .populate('sellerId', 'name shopName');

    const fullUrl = `https://${req.get('host')}/uploads/${populatedReel.videoUrl}`;

    res.status(201).json({
      success: true,
      data: { ...populatedReel._doc, videoUrl: fullUrl },
    });
  } catch (err) {
    console.error("UPLOAD REEL ERROR:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getAllReels = async (req, res) => {
  try {
    
    const userId = req.user ? (req.user.id || req.user._id) : null;
    const baseUrl = `https://${req.get('host')}/uploads/`;

    const reels = await Reel.find({ isBlocked: false })
      .populate('sellerId', 'shopName')
      .populate('productId')
      .sort({ createdAt: -1 });

    const formatted = reels.map((reel) => {
      
      const likedByClean = Array.isArray(reel.likedBy)
        ? reel.likedBy.filter(Boolean)
        : [];

      const likesCount = likedByClean.length;

      const isLiked =
        userId && likedByClean.length > 0
          ? likedByClean.some((id) => id.toString() === userId.toString())
          : false;

      return {
        ...reel._doc,
        videoUrl: baseUrl + reel.videoUrl, 
        likes: likesCount,
        isLiked,
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error("GET REELS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    // login check
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Please login to like" });
    }

    const userId = req.user.id || req.user._id;
    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({ success: false, message: "Reel not found" });
    }

    // likedBy array normalize – remove null values
    reel.likedBy = Array.isArray(reel.likedBy)
      ? reel.likedBy.filter(Boolean)
      : [];

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const index = reel.likedBy.findIndex(
      (id) => id.toString() === userObjectId.toString()
    );

    let isLiked;
    if (index === -1) {
      // not liked yet -> like
      reel.likedBy.push(userObjectId);
      isLiked = true;
    } else {
      // already liked -> unlike
      reel.likedBy.splice(index, 1);
      isLiked = false;
    }

    await reel.save();

    return res.json({
      success: true,
      likes: reel.likedBy.length,
      isLiked,
    });
  } catch (err) {
    console.error("TOGGLE LIKE ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.reportReel = async (req, res) => {
  try {
    const { reelId, reason } = req.body;

    console.log(`Reel ${reelId} reported for: ${reason}`);
    res.json({ success: true, message: "Report submitted successfully" });
  } catch (err) {
    console.error("REPORT REEL ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateReel = async (req, res) => {
  try {
    const updatedReel = await Reel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, data: updatedReel });
  } catch (err) {
    console.error("UPDATE REEL ERROR:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteReel = async (req, res) => {
  try {
    await Reel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Reel deleted successfully" });
  } catch (err) {
    console.error("DELETE REEL ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};