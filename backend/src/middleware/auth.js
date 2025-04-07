const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token and extract user info
const auth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization denied. Invalid token format.' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Check for development mode only
    if (process.env.NODE_ENV === 'development' && token === process.env.DEV_TOKEN) {
      req.user = { id: process.env.DEV_USER_ID || 'user123', email: process.env.DEV_USER_EMAIL || 'demo@example.com' };
      return next();
    }

    // Verify token with proper error handling
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    try {
      // Get user from database by MongoDB ID
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authorization denied. User not found.' });
      }
      
      // Add user object to request
      req.user = user;
    } catch (dbError) {
      console.error('Database error in auth middleware:', dbError.message);
      return res.status(500).json({ success: false, error: 'Server error when authenticating user' });
    }
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Authorization denied. Invalid token.' });
  }
};

module.exports = auth;