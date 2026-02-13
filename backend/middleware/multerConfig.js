const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 🔥 Always resolve from project root
const BASE_UPLOAD = path.resolve(process.cwd(), "public", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = BASE_UPLOAD;

    switch (file.fieldname) {

      case "profileImage":
        folder = path.join(BASE_UPLOAD, "sellers");
        break;
      // 🟢 PRODUCT
      case "images":
        folder = path.join(BASE_UPLOAD, "products");
        break;

      case "video":
        folder = path.join(BASE_UPLOAD, "products", "videos");
        break;

      // 🟢 CATEGORY / SUB-CATEGORY
      case "image":
        folder = path.join(BASE_UPLOAD, "categories");
        break;

      // 🟢 KYC
      case "pan_doc":
        folder = path.join(BASE_UPLOAD, "kyc", "pan");
        break;

      case "gst_doc":
        folder = path.join(BASE_UPLOAD, "kyc", "gst");
        break;

      case "fssai_doc":
        folder = path.join(BASE_UPLOAD, "kyc", "fssai");
        break;

      case "msme_doc":
        folder = path.join(BASE_UPLOAD, "kyc", "msme");
        break;

      default:
        folder = BASE_UPLOAD;
    }

    // 🔥 Ensure folder exists
    fs.mkdirSync(folder, { recursive: true });

    cb(null, folder);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB safe limit
  },
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype === "application/pdf";

    if (!allowed) {
      return cb(new Error("Unsupported file type"), false);
    }
    cb(null, true);
  }
});

// 🔹 keep for future image processing (sharp, compression, etc.)
const processImages = (req, res, next) => next();

module.exports = { upload, processImages };
