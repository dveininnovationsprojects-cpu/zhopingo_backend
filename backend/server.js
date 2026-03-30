// // const express = require('express');
// // const mongoose = require('mongoose');
// // const cookieParser = require('cookie-parser');
// // const cors = require('cors');
// // require('dotenv').config();
// // const path = require('path');
// // const authRoutes = require('./routes/authRoutes');
// // const walletRoutes = require('./routes/walletRoutes');



// // const app = express();
// // // Webhook MUST come before express.json
// // app.use(
// //   "/api/payments/cashfree/webhook",
// //   express.raw({ type: "application/json" }),
// //   require("./routes/cashfreeWebhook")
// // );



// // app.use("/api/payments", require("./routes/paymentRoutes"));

// // app.use(express.json());
// // app.use(cookieParser()); 
// // app.use(cors({ 
// //   origin: function (origin, callback) {
    
// //     if (!origin) return callback(null, true);
// //     return callback(null, true); 
// //   },
// //   credentials: true,
// //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
// //   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
// // })); 

// // const apiRoutes = require('./routes/apiRoutes');
// // // --- 🌟 STATIC FILES ---


// // app.use(
// //   "/uploads",
// //   express.static(path.resolve(process.cwd(), "public/uploads"))
// // );
// // app.use(
// //   '/uploads/categories',
// //   express.static(path.resolve(process.cwd(), "public/uploads/categories"))
// // );


// // app.use('/uploads/kyc', express.static(path.resolve(process.cwd(), "public/uploads/kyc")));

// // // --- 🌟 ROUTES ---
// // // Customer & Auth Routes
// // app.use('/api/v1/auth', require('./routes/authRoutes'));
// // app.use('/api/v1/wallet', require('./routes/walletRoutes'));
// // app.use('/api/v1/catalog', require('./routes/catalogRoutes'));
// // app.use('/api/v1/products', require('./routes/productRoutes'));
// // app.use('/api/v1/orders', require('./routes/orderRoutes'));
// // app.use('/api/v1/payments', require('./routes/paymentRoutes'));
// // app.use('/api/v1/reels', require('./routes/reelRoutes'));


// // // Seller & Admin Routes
// // app.use('/api/v1/seller', require('./routes/sellerRoutes'));
// // app.use('/api/v1/admin', require('./routes/adminRoutes'));

// // app.get("/", (req, res) => {
// //   res.send("Backend is running 🚀");
// // });

// // console.log("MONGO_URI =", process.env.MONGO_URI);

// // mongoose.connect(process.env.MONGO_URI )
// //   .then(() => console.log('✅ Zhopingo DB Connected'))
// //   .catch(err => console.error(err));

// // app.listen(5000, '0.0.0.0', () => {
// //   console.log('🚀 Server running on 0.0.0.0:5000');
// // });



// const express = require("express");
// const mongoose = require("mongoose");
// const cookieParser = require("cookie-parser");
// const cors = require("cors");
// const dotenv = require("dotenv");
// const path = require("path");

// dotenv.config();

// const app = express();

// // server.js-ல் தேடிப் பார்த்து இதைச் சேர்
// app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// app.use(express.json()); // இதற்கு மேலே அந்த வரி இருக்க வேண்டும்



// app.use(cookieParser());

// app.use(
//   cors({
//     origin: true, // allow all origins (frontend, admin, postman)
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
//   })
// );

// /* ======================================================
//    📁 STATIC FILE SERVING (IMPORTANT)
// ====================================================== */
// // 🔥 ONE STATIC ROOT IS ENOUGH
// app.use(
//   "/uploads",
//   express.static(path.resolve(process.cwd(), "public/uploads"))
// );

// /*
// Directory structure expected:
// public/uploads/
//  ├── categories/
//  ├── products/
//  │    └── videos/
//  └── kyc/
//       ├── pan/
//       ├── gst/
//       ├── fssai/
//       └── msme/
// */

// /* ======================================================
//    🚀 API ROUTES
// ====================================================== */

// // Auth & User
// app.use("/api/v1/auth", require("./routes/authRoutes"));
// app.use("/api/v1/wallet", require("./routes/walletRoutes"));

// // Catalog & Products
// app.use("/api/v1/catalog", require("./routes/catalogRoutes"));
// app.use("/api/v1/products", require("./routes/productRoutes"));

// // Orders & Payments
// app.use("/api/v1/orders", require("./routes/orderRoutes"));
// app.use("/api/v1/payments", require("./routes/paymentRoutes"));

// // Extra features
// app.use("/api/v1/reels", require("./routes/reelRoutes"));

// // Seller & Admin
// app.use("/api/v1/seller", require("./routes/sellerRoutes"));
// app.use("/api/v1/admin", require("./routes/adminRoutes"));

// /* ======================================================
//    🏠 HEALTH CHECK
// ====================================================== */
// app.get("/", (req, res) => {
//   res.send("🚀 Zhopingo Backend is running");
// });

// /* ======================================================
//    🛢️ DATABASE CONNECTION
// ====================================================== */
// console.log("MONGO_URI =", process.env.MONGO_URI);

// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => console.log("✅ MongoDB Connected"))
//   .catch(err => console.error("❌ MongoDB Error:", err));

// /* ======================================================
//    🔊 SERVER START
// ====================================================== */
// const PORT = process.env.PORT || 5000;

// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
// });

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");



const app = express();

/* ======================================================
    🔥 CASHFREE WEBHOOK (RAW BODY - MUST BE FIRST)
====================================================== */
// வெப்ஹூக் டேட்டாவை படிக்க இது மிக முக்கியம்
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

/* ======================================================
    🌍 GLOBAL MIDDLEWARES
====================================================== */
app.use(express.json()); 
app.use(cookieParser());

app.use(
  cors({
    origin: true, 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);

/* ======================================================
    📁 STATIC FILE SERVING
====================================================== */
app.use("/uploads", express.static(path.resolve(process.cwd(), "public/uploads")));

/* ======================================================
    🚀 API ROUTES
====================================================== */
app.use("/api/v1/auth", require("./routes/authRoutes"));
app.use("/api/v1/wallet", require("./routes/walletRoutes"));
app.use("/api/v1/catalog", require("./routes/catalogRoutes"));
app.use("/api/v1/products", require("./routes/productRoutes"));
app.use("/api/v1/orders", require("./routes/orderRoutes"));
app.use("/api/v1/payments", require("./routes/paymentRoutes"));
app.use("/api/v1/reels", require("./routes/reelRoutes"));
app.use("/api/v1/seller", require("./routes/sellerRoutes"));
app.use("/api/v1/admin", require("./routes/adminRoutes"));
app.use("/api/v1/logistics",require("./routes/logisticsRoutes"))

app.get("/", (req, res) => {
  res.send("🚀 Zhopingo Backend is running");
});

/* ======================================================
    🛢️ DATABASE CONNECTION
====================================================== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});