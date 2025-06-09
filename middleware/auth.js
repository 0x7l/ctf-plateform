const User = require('../models/user.model');

/**
 * Middleware to authenticate API token and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  // Check for Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid token.'
    });
  }
  
  try {
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Validate token and get user
    const user = await User.validateApiToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token. Please authenticate again.'
      });
    }
    
    // Check if user is active
    if (!user.active) {
      return res.status(403).json({
        success: false,
        error: 'User account is inactive.'
      });
    }
    
    // Add user to request object
    req.user = user;
    
    next();
  } catch (error) {
    console.log('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during authentication.'
    });
  }
};

/**
 * Middleware to authorize based on user role
 * @param {String[]} roles - Array of authorized roles
 * @returns {Function} - Express middleware
 */
const authorize = (roles = ['admin']) => {
  return (req, res, next) => {
    // Check if user exists (should be added by authenticate middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for this route.'
      });
    }
    
    // Check if user role is authorized
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Authorization failed. User role ${req.user.role} is not authorized for this resource.`
      });
    }
    
    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
