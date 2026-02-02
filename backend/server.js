const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');



const app = express();
app.use(express.json());
app.use(cookieParser()); 
app.use(cors({ 
  origin: function (origin, callback) {
    
    if (!origin) return callback(null, true);
    return callback(null, true); 
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
})); 

const apiRoutes = require('./routes/apiRoutes');
// --- 🌟 STATIC FILES ---
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/uploads/kyc', express.static(path.join(__dirname, 'uploads/kyc')));

// --- 🌟 ROUTES ---
// Customer & Auth Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/wallet', require('./routes/walletRoutes'));
app.use('/api/v1/catalog', require('./routes/catalogRoutes'));
app.use('/api/v1/products', require('./routes/productRoutes'));
app.use('/api/v1/orders', require('./routes/orderRoutes'));
app.use('/api/v1/payments', require('./routes/paymentRoutes'));
app.use('/api/v1/reels', require('./routes/reelRoutes'));

// Seller & Admin Routes
app.use('/api/v1/seller', require('./routes/sellerRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

console.log("MONGO_URI =", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI )
  .then(() => console.log('✅ Zhopingo DB Connected'))
  .catch(err => console.error(err));

app.listen(5000, '0.0.0.0', () => {
  console.log('🚀 Server running on 0.0.0.0:5000');
});
