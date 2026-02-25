



// const Reel = require('../models/Reel');
// const mongoose = require('mongoose');

// exports.uploadReel = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, error: "Please upload a video file" });
//     }

//     let productId = req.body.productId;

    
//     if (!productId || productId === 'null' || productId === '') {
//       productId = null;
//     }

//     const newReel = new Reel({
//       sellerId: req.body.sellerId,
//       productId: productId,
//       description: req.body.description,
//       videoUrl: req.file.filename, 
//     });

//     const savedReel = await newReel.save();

//     const populatedReel = await Reel.findById(savedReel._id)
//       .populate('productId')
//       .populate('sellerId', 'name shopName');

//     const fullUrl = `https://${req.get('host')}/uploads/${populatedReel.videoUrl}`;

//     res.status(201).json({
//       success: true,
//       data: { ...populatedReel._doc, videoUrl: fullUrl },
//     });
//   } catch (err) {
//     console.error("UPLOAD REEL ERROR:", err);
//     res.status(400).json({ success: false, error: err.message });
//   }
// };

// exports.getAllReels = async (req, res) => {
//   try {
//     const userId = req.user ? (req.user.id || req.user._id) : null;
//     const baseUrl = `https://${req.get('host')}/uploads/`;

//     const reels = await Reel.find({ isBlocked: false })
//       .populate('sellerId', 'shopName')
//       .populate('productId')
//       .populate('viewers', 'name phone') 
//       .populate('likedBy', 'name phone') 
//       .sort({ createdAt: -1 });

//     const formatted = reels.map((reel) => {
      
//       const likedByArray = Array.isArray(reel.likedBy) ? reel.likedBy : [];
      
     
//       const isLiked = userId && likedByArray.some((user) => 
//         (user._id ? user._id.toString() : user.toString()) === userId.toString()
//       );

//       return {
//         ...reel._doc,
//         videoUrl: baseUrl + reel.videoUrl, 
//         likes: likedByArray.length, 
//         isLiked: isLiked,
//         likers: reel.likedBy || [], 
//         views: reel.views || 0,
//         viewers: reel.viewers || []
//       };
//     });

//     res.json({ success: true, data: formatted });
//   } catch (err) {
//     console.error("GET REELS ERROR:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.toggleLike = async (req, res) => {
//   try {
//     // login check
//     if (!req.user) {
//       return res.status(401).json({ success: false, message: "Please login to like" });
//     }

//     const userId = req.user.id || req.user._id;
//     const reel = await Reel.findById(req.params.id);

//     if (!reel) {
//       return res.status(404).json({ success: false, message: "Reel not found" });
//     }

//     // likedBy array normalize – remove null values
//     reel.likedBy = Array.isArray(reel.likedBy)
//       ? reel.likedBy.filter(Boolean)
//       : [];

//     const userObjectId = new mongoose.Types.ObjectId(userId);
//     const index = reel.likedBy.findIndex(
//       (id) => id.toString() === userObjectId.toString()
//     );

//     let isLiked;
//     if (index === -1) {
//       // not liked yet -> like
//       reel.likedBy.push(userObjectId);
//       isLiked = true;
//     } else {
//       // already liked -> unlike
//       reel.likedBy.splice(index, 1);
//       isLiked = false;
//     }

//     await reel.save();

//     return res.json({
//       success: true,
//       likes: reel.likedBy.length,
//       isLiked,
//     });
//   } catch (err) {
//     console.error("TOGGLE LIKE ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.reportReel = async (req, res) => {
//   try {
//     const { reelId, reason } = req.body;

//     console.log(`Reel ${reelId} reported for: ${reason}`);
//     res.json({ success: true, message: "Report submitted successfully" });
//   } catch (err) {
//     console.error("REPORT REEL ERROR:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// exports.updateReel = async (req, res) => {
//   try {
//     const updatedReel = await Reel.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true }
//     );
//     res.json({ success: true, data: updatedReel });
//   } catch (err) {
//     console.error("UPDATE REEL ERROR:", err);
//     res.status(400).json({ success: false, error: err.message });
//   }
// };

// /* =====================================================
//     🌟 2. ADD REEL VIEW (புதிய ஃபங்க்ஷன் - Like-ஐ பாதிக்காது)
// ===================================================== */
// exports.addReelView = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user ? (req.user.id || req.user._id) : null;

//     const reel = await Reel.findById(id);
//     if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });

//     // வியூ கவுண்ட் மட்டும் ஏற்றுகிறோம்
//     reel.views = (reel.views || 0) + 1;

//     // லாகின் செய்த பயனர் பார்த்தால் மட்டும் viewers லிஸ்டில் சேர்க்கிறோம்
//     if (userId) {
//       const userObjectId = new mongoose.Types.ObjectId(userId);
//       if (!reel.viewers) reel.viewers = []; // viewers array இல்லை என்றால் உருவாக்குகிறது
      
//       if (!reel.viewers.includes(userObjectId)) {
//         reel.viewers.push(userObjectId);
//       }
//     }

//     await reel.save();
//     res.json({ success: true, views: reel.views });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// exports.deleteReel = async (req, res) => {
//   try {
//     await Reel.findByIdAndDelete(req.params.id);
//     res.json({ success: true, message: "Reel deleted successfully" });
//   } catch (err) {
//     console.error("DELETE REEL ERROR:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// const Reel = require('../models/Reel');
// const mongoose = require('mongoose');
// const { s3 } = require('../middleware/multerConfig'); // 🌟 S3 cleanup-kaga

// exports.uploadReel = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, error: "Please upload a video file" });
//     }

//     let productId = req.body.productId;

//     if (!productId || productId === 'null' || productId === '') {
//       productId = null;
//     }

//     const newReel = new Reel({
//       sellerId: req.body.sellerId,
//       productId: productId,
//       description: req.body.description,
//       // 🌟 Multer-S3 moolama kidaikkira 'key' (videos/123.mp4) save pannuvom
//       videoUrl: req.file.key, 
//     });

//     const savedReel = await newReel.save();

//     const populatedReel = await Reel.findById(savedReel._id)
//       .populate('productId')
//       .populate('sellerId', 'name shopName');

//     // 🌟 Lightning Fast CloudFront URL
//     const fullUrl = process.env.CLOUDFRONT_URL + populatedReel.videoUrl;

//     res.status(201).json({
//       success: true,
//       data: { ...populatedReel._doc, videoUrl: fullUrl },
//     });
//   } catch (err) {
//     console.error("UPLOAD REEL ERROR:", err);
//     res.status(400).json({ success: false, error: err.message });
//   }
// };

// exports.getAllReels = async (req, res) => {
//   try {
//     const userId = req.user ? (req.user.id || req.user._id) : null;
//     // 🌟 S3 CloudFront Base URL
//     const CF_URL = process.env.CLOUDFRONT_URL;

//     const reels = await Reel.find({ isBlocked: false })
//       .populate('sellerId', 'shopName')
//       .populate('productId')
//       .populate('viewers', 'name phone') 
//       .populate('likedBy', 'name phone') 
//       .sort({ createdAt: -1 })
//       .lean(); // Faster performance

//     const formatted = reels.map((reel) => {
//       const likedByArray = Array.isArray(reel.likedBy) ? reel.likedBy : [];
      
//       const isLiked = userId && likedByArray.some((user) => 
//         (user._id ? user._id.toString() : user.toString()) === userId.toString()
//       );

//       return {
//         ...reel,
//         // 🌟 Video streaming via CloudFront
//         videoUrl: CF_URL + reel.videoUrl, 
//         likes: likedByArray.length, 
//         isLiked: isLiked,
//         likers: reel.likedBy || [], 
//         views: reel.views || 0,
//         viewers: reel.viewers || []
//       };
//     });

//     res.json({ success: true, data: formatted });
//   } catch (err) {
//     console.error("GET REELS ERROR:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.toggleLike = async (req, res) => {
//   try {
//     if (!req.user) {
//       return res.status(401).json({ success: false, message: "Please login to like" });
//     }

//     const userId = req.user.id || req.user._id;
//     const reel = await Reel.findById(req.params.id);

//     if (!reel) {
//       return res.status(404).json({ success: false, message: "Reel not found" });
//     }

//     reel.likedBy = Array.isArray(reel.likedBy) ? reel.likedBy.filter(Boolean) : [];

//     const userObjectId = new mongoose.Types.ObjectId(userId);
//     const index = reel.likedBy.findIndex(
//       (id) => id.toString() === userObjectId.toString()
//     );

//     let isLiked;
//     if (index === -1) {
//       reel.likedBy.push(userObjectId);
//       isLiked = true;
//     } else {
//       reel.likedBy.splice(index, 1);
//       isLiked = false;
//     }

//     await reel.save();

//     return res.json({
//       success: true,
//       likes: reel.likedBy.length,
//       isLiked,
//     });
//   } catch (err) {
//     console.error("TOGGLE LIKE ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

// exports.reportReel = async (req, res) => {
//   try {
//     const { reelId, reason } = req.body;
//     console.log(`Reel ${reelId} reported for: ${reason}`);
//     res.json({ success: true, message: "Report submitted successfully" });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// exports.updateReel = async (req, res) => {
//   try {
//     const updatedReel = await Reel.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true }
//     );
//     res.json({ success: true, data: updatedReel });
//   } catch (err) {
//     res.status(400).json({ success: false, error: err.message });
//   }
// };

// exports.addReelView = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user ? (req.user.id || req.user._id) : null;

//     const reel = await Reel.findById(id);
//     if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });

//     reel.views = (reel.views || 0) + 1;

//     if (userId) {
//       const userObjectId = new mongoose.Types.ObjectId(userId);
//       if (!reel.viewers) reel.viewers = []; 
      
//       if (!reel.viewers.includes(userObjectId)) {
//         reel.viewers.push(userObjectId);
//       }
//     }

//     await reel.save();
//     res.json({ success: true, views: reel.views });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

// // 🌟 DELETE REEL with S3 Cleanup
// exports.deleteReel = async (req, res) => {
//   try {
//     const reel = await Reel.findById(req.params.id);
//     if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });

//     // 🔥 Senior Peer Logic: Delete video from S3 bucket
//     if (reel.videoUrl) {
//         await s3.deleteObject({
//             Bucket: process.env.AWS_BUCKET_NAME,
//             Key: reel.videoUrl
//         }).promise();
//     }

//     await Reel.findByIdAndDelete(req.params.id);
//     res.json({ success: true, message: "Reel and S3 video deleted successfully" });
//   } catch (err) {
//     console.error("DELETE REEL ERROR:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

const Reel = require('../models/Reel');
const mongoose = require('mongoose');
const { s3 } = require('../middleware/multerConfig');
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

// 🌟 1. UPLOAD REEL (S3 Compatible)
exports.uploadReel = async (req, res) => {
  try {
    // Multer file field 'video' check
    if (!req.file) {
      return res.status(400).json({ success: false, error: "Please upload a video file using the key 'video'" });
    }

    let productId = req.body.productId;
    if (!productId || productId === 'null' || productId === '') {
      productId = null;
    }

    const newReel = new Reel({
      sellerId: req.body.sellerId,
      productId: productId,
      description: req.body.description,
      // local-la 'filename' irukkum, S3-la 'key' thaan mukkiyam
      videoUrl: req.file.key, 
    });

    const savedReel = await newReel.save();

    const populatedReel = await Reel.findById(savedReel._id)
      .populate('productId')
      .populate('sellerId', 'name shopName');

    // CloudFront URL generation
    const CF_URL = process.env.CLOUDFRONT_URL || "https://d1utzn73483swp.cloudfront.net/";
    
    res.status(201).json({
      success: true,
      data: { 
        ...populatedReel._doc, 
        videoUrl: CF_URL + populatedReel.videoUrl 
      },
    });
  } catch (err) {
    console.error("UPLOAD REEL ERROR:", err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// 🌟 2. GET ALL REELS
exports.getAllReels = async (req, res) => {
  try {
    const userId = req.user ? (req.user.id || req.user._id) : null;
    const CF_URL = process.env.CLOUDFRONT_URL || "https://d1utzn73483swp.cloudfront.net/";

    const reels = await Reel.find({ isBlocked: false })
      .populate('sellerId', 'shopName')
      .populate('productId')
      .populate('viewers', 'name phone') 
      .populate('likedBy', 'name phone') 
      .sort({ createdAt: -1 })
      .lean(); 

    const formatted = reels.map((reel) => {
      const likedByArray = Array.isArray(reel.likedBy) ? reel.likedBy : [];
      const isLiked = userId && likedByArray.some((user) => 
        (user._id ? user._id.toString() : user.toString()) === userId.toString()
      );

      return {
        ...reel,
        videoUrl: CF_URL + reel.videoUrl, 
        likes: likedByArray.length, 
        isLiked: isLiked,
        views: reel.views || 0,
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🌟 3. TOGGLE LIKE
exports.toggleLike = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Please login to like" });
    
    const userId = req.user.id || req.user._id;
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });

    reel.likedBy = Array.isArray(reel.likedBy) ? reel.likedBy.filter(Boolean) : [];
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const index = reel.likedBy.findIndex(id => id.toString() === userObjectId.toString());

    let isLiked;
    if (index === -1) {
      reel.likedBy.push(userObjectId);
      isLiked = true;
    } else {
      reel.likedBy.splice(index, 1);
      isLiked = false;
    }

    await reel.save();
    res.json({ success: true, likes: reel.likedBy.length, isLiked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🌟 4. DELETE REEL (Fixed with S3 Cleanup)
exports.deleteReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });

    if (reel.videoUrl) {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: reel.videoUrl
      }));
    }

    await Reel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Reel and S3 video deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 🌟 5. ADD REEL VIEW
exports.addReelView = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? (req.user.id || req.user._id) : null;

    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });

    reel.views = (reel.views || 0) + 1;
    if (userId) {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      if (!reel.viewers) reel.viewers = []; 
      if (!reel.viewers.includes(userObjectId)) reel.viewers.push(userObjectId);
    }

    await reel.save();
    res.json({ success: true, views: reel.views });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.reportReel = async (req, res) => {
  res.json({ success: true, message: "Report submitted successfully" });
};