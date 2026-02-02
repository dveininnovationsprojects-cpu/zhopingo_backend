const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "uploads/kyc/others";

    if (file.fieldname === "pan_doc") folder = "uploads/kyc/pan";
    if (file.fieldname === "gst_doc") folder = "uploads/kyc/gst";
    if (file.fieldname === "fssai_doc") folder = "uploads/kyc/fssai";
    if (file.fieldname === "msme_doc") folder = "uploads/kyc/msme";

    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("File type not allowed"));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});
