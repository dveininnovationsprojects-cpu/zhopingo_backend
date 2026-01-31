const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  // Accessing token from cookies instead of Authorization header
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zhopingo_secret');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Token is invalid" });
  }
};