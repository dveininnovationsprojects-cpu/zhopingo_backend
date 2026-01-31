const multer = require('multer');
const path = require('path');
const fs = require('fs');


const uploadDir = 'public/uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        
        cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB வரை வீடியோக்களை அனுமதிக்க
});

module.exports = upload;