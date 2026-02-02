const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  let token;

  // 1. Authorization Header-ல் டோக்கன் இருக்கிறதா என்று பார்க்கிறது
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // 2. இல்லையென்றால் Cookies-ல் தேடுகிறது
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Authentication required. Please login." 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zhopingo_secret');
    req.user = decoded; // 🌟 டோக்கனில் உள்ள யூசர் டேட்டாவை req.user-ல் வைக்கிறது
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Token is invalid or expired" });
  }
};