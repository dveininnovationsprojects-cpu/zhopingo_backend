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
app.use(cookieParser()); // Mukkiyam: Cookie handling-ku
app.use(cors({ 
  origin: true, 
  credentials: true 
})); // Cookie support-ku

const apiRoutes = require('./routes/apiRoutes');
app.use('/api/v1', apiRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/api/v1/catalog', require('./routes/catalogRoutes'));
app.use('/api/v1/products', require('./routes/productRoutes'));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/wallet', walletRoutes);

console.log("MONGO_URI =", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zhopingo')
  .then(() => console.log('✅ Zhopingo DB Connected'))
  .catch(err => console.error(err));

app.listen(5000, () => console.log('🚀 Server on 5000'));