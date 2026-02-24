// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// // 🔥 Always resolve from project root
// const BASE_UPLOAD = path.resolve(process.cwd(), "public", "uploads");

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     let folder = BASE_UPLOAD;

//     switch (file.fieldname) {

//       case "profileImage":
//         folder = path.join(BASE_UPLOAD, "sellers");
//         break;
//       // 🟢 PRODUCT
//       case "images":
//         folder = path.join(BASE_UPLOAD, "products");
//         break;

//       case "video":
//         folder = path.join(BASE_UPLOAD, "products", "videos");
//         break;

//       // 🟢 CATEGORY / SUB-CATEGORY
//       case "image":
//         folder = path.join(BASE_UPLOAD, "categories");
//         break;

//       // 🟢 KYC
//       case "pan_doc":
//         folder = path.join(BASE_UPLOAD, "kyc", "pan");
//         break;

//       case "gst_doc":
//         folder = path.join(BASE_UPLOAD, "kyc", "gst");
//         break;

//       case "fssai_doc":
//         folder = path.join(BASE_UPLOAD, "kyc", "fssai");
//         break;

//       case "msme_doc":
//         folder = path.join(BASE_UPLOAD, "kyc", "msme");
//         break;

//       default:
//         folder = BASE_UPLOAD;
//     }

//     // 🔥 Ensure folder exists
//     fs.mkdirSync(folder, { recursive: true });

//     cb(null, folder);
//   },

//   filename: (req, file, cb) => {
//     const uniqueName =
//       Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, uniqueName + path.extname(file.originalname));
//   }
// });

// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 50 * 1024 * 1024 // 50MB safe limit
//   },
//   fileFilter: (req, file, cb) => {
//     const allowed =
//       file.mimetype.startsWith("image/") ||
//       file.mimetype.startsWith("video/") ||
//       file.mimetype === "application/pdf";

//     if (!allowed) {
//       return cb(new Error("Unsupported file type"), false);
//     }
//     cb(null, true);
//   }
// });

// // 🔹 keep for future image processing (sharp, compression, etc.)
// const processImages = (req, res, next) => next();

// module.exports = { upload, processImages };

const { S3Client } = require("@aws-sdk/client-s3");
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// 🌟 AWS SDK v3 Client - Modern Standard
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      let folder = 'others';
      switch (file.fieldname) {
        case "profileImage": folder = "sellers"; break;
        case "images": folder = "products"; break;
        case "video": folder = "products/videos"; break;
        case "image": folder = "categories"; break;
        case "pan_doc": folder = "kyc/pan"; break;
        case "gst_doc": folder = "kyc/gst"; break;
        case "fssai_doc": folder = "kyc/fssai"; break;
        case "msme_doc": folder = "kyc/msme"; break;
        default: folder = "others";
      }
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${folder}/${uniqueName}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/") || file.mimetype === "application/pdf";
    allowed ? cb(null, true) : cb(new Error("Unsupported file type"), false);
  }
});

// 🌟 Process Image Middleware (Existing logic preserved)
const processImages = (req, res, next) => next();

module.exports = { upload, s3, processImages };