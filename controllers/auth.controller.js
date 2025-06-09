const authService = require('../services/auth.service');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    // Validate input
    const { username, email, role, password } = req.body;
    
    if (!username || !email || !role || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username, email, role and password'
      });
    }
    
    //Validate role if provided
    const allowedRoles = ['admin', 'user'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified'
      });
    }

    // Register user
    const result = await authService.registerUser({
      username,
      email,
      role: role || 'user',
      password
    });
    
    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (err) {
    console.log('Registration error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email/username and password'
      });
    }
    
    // Login user
    const result = await authService.loginUser(email, password);
    
    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        token: result.token
      }
    });
  } catch (err) {
    console.log('Login error:', err);
    res.status(401).json({
      success: false,
      error: err.message
    });
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    // User should be attached by auth middleware
    const user = req.user;
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.log('Get current user error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error fetching user data'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/me
 * @access  Private
 */
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Update user
    const user = await authService.updateUser(req.user._id, {
      username,
      email,
      password
    });
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.log('Update profile error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

/**
 * @desc    Get user by ID (admin only)
 * @route   GET /api/auth/users/:id
 * @access  Private/Admin
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await authService.getUserById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.log('Get user error:', err);
    res.status(404).json({
      success: false,
      error: err.message
    });
  }
};

/**
 * @desc    Update user (admin only)
 * @route   PUT /api/auth/users/:id
 * @access  Private/Admin
 */
exports.updateUser = async (req, res) => {
  try {
    const { username, email, password, role, active } = req.body;
    
    // Admin can update additional fields
    const user = await authService.updateUser(req.params.id, {
      username,
      email,
      password,
      role,
      active,
      isAdminRequest: true
    });
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.log('Update user error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};
