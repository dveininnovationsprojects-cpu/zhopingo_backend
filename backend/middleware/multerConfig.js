const multer = require("multer");
const path = require("path");
const fs = require("fs");

const BASE_UPLOAD = path.join(__dirname, "../public/uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = BASE_UPLOAD;

    // product images
    if (file.fieldname === "images") folder = path.join(BASE_UPLOAD, "products");
    if (file.fieldname === "video") folder = path.join(BASE_UPLOAD, "products/videos");

    // category / sub-category
    if (file.fieldname === "image") folder = path.join(BASE_UPLOAD, "categories");

    // kyc
    if (file.fieldname === "pan_doc") folder = path.join(BASE_UPLOAD, "kyc/pan");
    if (file.fieldname === "gst_doc") folder = path.join(BASE_UPLOAD, "kyc/gst");
    if (file.fieldname === "fssai_doc") folder = path.join(BASE_UPLOAD, "kyc/fssai");
    if (file.fieldname === "msme_doc") folder = path.join(BASE_UPLOAD, "kyc/msme");

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },

  filename: (req, file, cb) => {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"), false);
    }
  }
});

// 👇 JUST pass-through (future-proof)
const processImages = (req, res, next) => next();

module.exports = { upload, processImages };
