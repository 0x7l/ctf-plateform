const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const cors = require('cors');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize express app
const app = express();

// Apply middleware
app.use(logger);

// Use the rate limiter from express-rate-limit instead of custom implementation
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 100, // Maximum 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  }
});

// Challenge deployment rate limiter
const deploymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5, //limit each IP to 5 deployments per windowMs
  message: {
    success: false,
    error: 'Too many deployment requests, please try again later'
  }
});

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);
app.use('api/challenges/:id/deploy', deploymentLimiter);

// CORS middleware
app.use(cors({
  origin: '*', // In production, you would limit this to specific origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Define routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/challenges', require('./routes/challenge.routes'));
app.use('/api/ctf-running', require('./routes/ctfRunningChallenge.routes'));
app.use('/api/solves', require('./routes/solve.routes'));
app.use('/api/db-admin', require('./routes/dbAdmin.routes'));
app.use('/api/leaderboard', require('./routes/leaderboard.routes'));

// Root route for API health check
app.get('/', (req, res) => {
  res.json({
    message: 'CTF Platform API is running'
  });
});

// Error handling middleware
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// Set port from environment variables or default to 3000
const PORT = process.env.PORT || 4445;

// Start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process with failure
    server.close(() => process.exit(1));
  });
}

// Export app for testing
module.exports = app;