const mongoose = require("mongoose");

const sellerSchema = new mongoose.Schema(
  {
    /* ================= BASIC DETAILS ================= */
    name: {
      type: String,
      required: true,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    email: {
      type: String,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    shopName: {
      type: String,
      trim: true
    },

    /* ================= KYC NUMBERS ================= */
    panNumber: {
      type: String,
      trim: true
    },

    gstNumber: {
      type: String,
      trim: true
    },

    fssaiNumber: {
      type: String,
      trim: true
    },

    /* ================= KYC FILES ================= */
    kycDocuments: {
      panDoc: {
        fileName: String,
        fileUrl: String,
        mimeType: String
      },
      gstDoc: {
        fileName: String,
        fileUrl: String,
        mimeType: String
      },
      fssaiDoc: {
        fileName: String,
        fileUrl: String,
        mimeType: String
      },
      msmeDoc: {
        fileName: String,
        fileUrl: String,
        mimeType: String
      }
    },

    /* ================= VERIFICATION STATUS ================= */
    kycStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted"
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    /* ================= ADMIN ================= */
    rejectionReason: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Seller", sellerSchema);
