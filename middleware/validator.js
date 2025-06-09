// Middleware for validating user registration input
const validateRegisterInput = (req, res, next) => {
  const { username, email, password } = req.body;
  
  // Check if all required fields are present
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: username, email, and password are required'
    });
  }
  
  // Validate username length
  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({
      success: false,
      error: 'Username must be between 3 and 30 characters'
    });
  }
  
  // Validate email format with regex
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid email address'
    });
  }
  
  // Validate password (at least 8 characters)
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long'
    });
  }
  
  next();
};

// Middleware for validating login input
const validateLoginInput = (req, res, next) => {
  const { identifier, password } = req.body;
  
  // Check if all required fields are present
  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: identifier (username or email) and password are required'
    });
  }
  
  next();
};

// Middleware for validating challenge input
const validateChallengeInput = (req, res, next) => {
  const { title, description, category, difficulty, databaseRequired, databaseType } = req.body;
  
  // For PUT requests (updates), we only validate fields that are present
  if (req.method === 'PUT') {
    // If difficulty is provided, validate it
    if (difficulty) {
      const allowedDifficulties = ['easy', 'medium', 'hard', 'expert'];
      if (!allowedDifficulties.includes(difficulty)) {
        return res.status(400).json({
          success: false,
          error: `Difficulty must be one of: ${allowedDifficulties.join(', ')}`
        });
      }
    }
    
    // If databaseType is provided, validate it
    if (databaseType) {
      const allowedDatabaseTypes = ['mongodb', 'mysql', 'postgresql', 'sqlite', 'redis', 'none'];
      if (!allowedDatabaseTypes.includes(databaseType)) {
        return res.status(400).json({
          success: false,
          error: `Database type must be one of: ${allowedDatabaseTypes.join(', ')}`
        });
      }
    }
    
    // Allow the update to proceed
    return next();
  }
  
  // For POST requests (create), require all fields
  if (!title || !description || !category || !difficulty) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: title, description, category, and difficulty are required'
    });
  }
  
  // Validate difficulty against allowed values
  const allowedDifficulties = ['easy', 'medium', 'hard', 'expert'];
  if (!allowedDifficulties.includes(difficulty)) {
    return res.status(400).json({
      success: false,
      error: `Difficulty must be one of: ${allowedDifficulties.join(', ')}`
    });
  }
  
  // If databaseRequired is true, databaseType cannot be 'none'
  if (databaseRequired === true && databaseType === 'none') {
    return res.status(400).json({
      success: false,
      error: 'If database is required, you must specify a database type other than "none"'
    });
  }
  
  // If databaseType is provided, validate it
  if (databaseType) {
    const allowedDatabaseTypes = ['mongodb', 'mysql', 'postgresql', 'sqlite', 'redis', 'none'];
    if (!allowedDatabaseTypes.includes(databaseType)) {
      return res.status(400).json({
        success: false,
        error: `Database type must be one of: ${allowedDatabaseTypes.join(', ')}`
      });
    }
  }
  
  next();
};

// Middleware for validating CTF running challenge input
const validateRunningChallengeInput = (req, res, next) => {
  const { challengeId, flag, points } = req.body;
  
  // For PUT requests (updates), we only validate fields that are present
  if (req.method === 'PUT') {
    // If points is provided, validate it
    if (points !== undefined) {
      if (typeof points !== 'number' || points < 0) {
        return res.status(400).json({
          success: false,
          error: 'Points must be a positive number'
        });
      }
    }
    
    // Allow the update to proceed
    return next();
  }
  
  // For POST requests (create), require all fields
  if (!challengeId || !flag || points === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: challengeId, flag, and points are required'
    });
  }
  
  // Validate points is a positive number
  if (typeof points !== 'number' || points < 0) {
    return res.status(400).json({
      success: false,
      error: 'Points must be a positive number'
    });
  }
  
  next();
};

// Middleware for validating solve input
const validateSolveInput = (req, res, next) => {
  const { userId, challengeId } = req.body;
  
  // For PUT requests (updates), we only validate if any required fields are present
  if (req.method === 'PUT') {
    // Allow the update to proceed
    return next();
  }
  
  // For POST requests (create), require all fields
  if (!userId || !challengeId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: userId and challengeId are required'
    });
  }
  
  next();
};

// Middleware for validating db admin input
const validateDbAdminInput = (req, res, next) => {
  const { databaseType, instanceName, connectionString, host, port, adminUsername, adminPassword } = req.body;
  
  // For PUT requests (updates), we only validate fields that are present
  if (req.method === 'PUT') {
    // If databaseType is provided, validate it
    if (databaseType) {
      const allowedDatabaseTypes = ['mongodb', 'mysql', 'postgresql', 'sqlite', 'redis'];
      if (!allowedDatabaseTypes.includes(databaseType)) {
        return res.status(400).json({
          success: false,
          error: `Database type must be one of: ${allowedDatabaseTypes.join(', ')}`
        });
      }
    }
    
    // Allow the update to proceed
    return next();
  }
  
  // For POST requests (create), require all fields
  if (!databaseType || !instanceName || !connectionString || !host || !port || !adminUsername || !adminPassword) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: databaseType, instanceName, connectionString, host, port, adminUsername, and adminPassword are required'
    });
  }
  
  // Validate database type
  const allowedDatabaseTypes = ['mongodb', 'mysql', 'postgresql', 'sqlite', 'redis'];
  if (!allowedDatabaseTypes.includes(databaseType)) {
    return res.status(400).json({
      success: false,
      error: `Database type must be one of: ${allowedDatabaseTypes.join(', ')}`
    });
  }
  
  next();
};

module.exports = {
  validateChallengeInput,
  validateRunningChallengeInput,
  validateSolveInput,
  validateDbAdminInput,
  validateRegisterInput,
  validateLoginInput
};