const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const storage = multer.memoryStorage(); // Store in RAM for Sharp to process

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } 
});

const processImages = async (req, res, next) => {
    if (!req.files && !req.file) return next();

    try {
        const uploadDir = 'public/uploads/';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const processFile = async (file) => {
            const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
            await sharp(file.buffer)
                .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 }) 
                .toFile(path.join(uploadDir, fileName));
            file.filename = fileName; // Important for your Controller
        };

        if (req.files && req.files['images']) {
            await Promise.all(req.files['images'].map(file => processFile(file)));
        }

        if (req.files && req.files['video']) {
            const video = req.files['video'][0];
            const videoName = `${Date.now()}-${video.originalname.replace(/\s/g, '_')}`;
            fs.writeFileSync(path.join(uploadDir, videoName), video.buffer);
            video.filename = videoName;
        }
        next();
    } catch (err) {
        res.status(500).json({ success: false, error: "Image processing failed" });
    }
};

module.exports = { upload, processImages }; // Exporting BOTH