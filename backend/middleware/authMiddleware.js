const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  let token;

  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hVVYvMx4PysJmsoZv679+1S/xx/YP4JRZmrYtNfXLiU80U3Nd+XCdRoroUFl4pbRyTf2x+e2AIvI9K8c0bE4gQ==');
    req.user = decoded; 
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Token is invalid or expired" });
  }
};