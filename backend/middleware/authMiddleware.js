const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please login."
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET ||
        'hVVYvMx4PysJmsoZv679+1S/xx/YP4JRZmrYtNfXLiU80U3Nd+XCdRoroUFl4pbRyTf2x+e2AIvI9K8c0bE4gQ=='
    );

    // 🔥 NORMALIZE USER OBJECT
   req.user = { id: decoded.id };

    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: "Token is invalid or expired"
    });
  }
};

// 🌟 2. புதிய மிடில்வேர் (லாக்-இன் செய்திருந்தால் ஐடியை எடுக்கும், இல்லையென்றால் விட்டுவிடும்)
exports.optionalProtect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'hVVYvMx4PysJmsoZv679+1S/xx/YP4JRZmrYtNfXLiU80U3Nd+XCdRoroUFl4pbRyTf2x+e2AIvI9K8c0bE4gQ=='
      );
      req.user = { id: decoded.id };
    } catch (err) {
      // டோக்கன் தப்பாக இருந்தால் கவலைப்படாமல் அடுத்த ஸ்டெப்பிற்கு செல்லும்
      console.log("Optional Auth: Invalid Token");
    }
  }
  next(); // 🌟 இதுதான் முக்கியம், டோக்கன் இல்லையென்றாலும் அடுத்த ஸ்டெப்பிற்குச் செல்லும்
};