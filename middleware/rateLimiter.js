// Simple rate limiting middleware implementation
const rateLimit = () => {
  const requestCounts = {};
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 100; // Maximum requests per window
  
  // Clean up old request counts periodically
  setInterval(() => {
    const now = Date.now();
    for (const ip in requestCounts) {
      if (now - requestCounts[ip].timestamp > windowMs) {
        delete requestCounts[ip];
      }
    }
  }, windowMs);
  
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    
    // Initialize or reset if window expired
    if (!requestCounts[ip] || now - requestCounts[ip].timestamp > windowMs) {
      requestCounts[ip] = {
        count: 1,
        timestamp: now
      };
      return next();
    }
    
    // Increment count
    requestCounts[ip].count++;
    
    // Check if rate limit exceeded
    if (requestCounts[ip].count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later'
      });
    }
    
    next();
  };
};

module.exports = rateLimit;
