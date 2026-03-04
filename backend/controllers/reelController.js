const Reel = require('../models/Reel');
const mongoose = require('mongoose');
const { s3 } = require('../middleware/multerConfig');
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

// 🌟 Helper: CloudFront URL-ai attach panna (Exactly like Product Flow)
const formatReelMedia = (reel) => {
    const CF_URL = process.env.CLOUDFRONT_URL || "https://d1utzn73483swp.cloudfront.net/";
    const doc = reel.toObject ? reel.toObject() : reel;

    return {
        ...doc,
        videoUrl: doc.videoUrl ? 
            (doc.videoUrl.startsWith('http') ? doc.videoUrl : CF_URL + doc.videoUrl) 
            : ""
    };
};

// 🌟 1. UPLOAD REEL (Exactly same flow as Product Create)
exports.uploadReel = async (req, res) => {
    try {
        // 🔥 THE FIX: Multer configuration-la 'single' use pannuna 'req.file' varum
        // Product flow-la 'fields' use pannuradhala 'req.files' varum.
        // Un route-la 'upload.single('video')' irundha idhu katchithama work aagum:
        const videoFile = req.file; 

        if (!videoFile) {
            return res.status(400).json({ success: false, error: "Please upload a video file" });
        }

        let productId = req.body.productId;
        if (!productId || productId === 'null' || productId === '') {
            productId = null;
        }

        // 🔥 THE MAPPING: Product controller-la 'key' edukkura maariye ingayum 'key'
        const newReel = new Reel({
            sellerId: req.body.sellerId,
            productId: productId,
            description: req.body.description,
            videoUrl: videoFile.key,
          // 👈 S3 Object Key assignment
        });

        const savedReel = await newReel.save();

        // Populate and Format response
        const populatedReel = await Reel.findById(savedReel._id)
            .populate('productId')
            .populate('sellerId', 'name shopName');

        res.status(201).json({
            success: true,
            data: formatReelMedia(populatedReel),
        });
    } catch (err) {
        console.error("UPLOAD REEL ERROR:", err);
        res.status(400).json({ success: false, error: err.message });
    }
};

// 🌟 41. Fixed getAllReels with Likers & Viewers Populate
exports.getAllReels = async (req, res) => {
    try {
        const userId = req.user ? (req.user.id || req.user._id) : null;

        const reels = await Reel.find({ isBlocked: false })
            .populate('sellerId', 'shopName name')
            .populate('productId', 'name price images')
            .populate('likedBy', 'name phone') // 🌟 Name and Phone strictly added
            .populate('viewers', 'name phone') // 🌟 Name and Phone strictly added
            .sort({ createdAt: -1 })
            .lean(); 

        const data = reels.map((reel) => {
            const formatted = formatReelMedia(reel);
            const likedByArray = Array.isArray(reel.likedBy) ? reel.likedBy : [];
            const viewersArray = Array.isArray(reel.viewers) ? reel.viewers : [];
            
            return {
                ...formatted,
                likes: likedByArray.length, 
                viewers: viewersArray, // Full objects now available
                likedBy: likedByArray, // Full objects now available
                isLiked: userId && likedByArray.some((u) => u._id?.toString() === userId.toString()),
                views: reel.views || viewersArray.length,
            };
        });

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 🌟 3. DELETE REEL
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

// ... (Other functions like toggleLike, addReelView are same)
exports.toggleLike = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: "Please login" });
        const reel = await Reel.findById(req.params.id);
        if (!reel) return res.status(404).json({ success: false, message: "Reel not found" });
        reel.likedBy = Array.isArray(reel.likedBy) ? reel.likedBy.filter(Boolean) : [];
        const userObjectId = new mongoose.Types.ObjectId(req.user.id || req.user._id);
        const index = reel.likedBy.findIndex((id) => id.toString() === userObjectId.toString());
        if (index === -1) { reel.likedBy.push(userObjectId); } 
        else { reel.likedBy.splice(index, 1); }
        await reel.save();
        res.json({ success: true, likes: reel.likedBy.length, isLiked: index === -1 });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.addReelView = async (req, res) => {
    try {
        const userId = req.user?.id;
        const updateQuery = { $inc: { views: 1 } };

        if (userId) {
            
            updateQuery.$addToSet = { viewers: userId };
        }

        const reel = await Reel.findByIdAndUpdate(req.params.id, updateQuery, { new: true });
        res.json({ success: true, views: reel?.views || 0 });
    } catch (err) { 
        res.status(500).json({ success: false, error: err.message }); 
    }
};

exports.reportReel = async (req, res) => {
    res.json({ success: true, message: "Report submitted successfully" });
};