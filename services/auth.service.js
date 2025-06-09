const User = require('../models/user.model');

/**
 * Register a new user
 * @param {Object} userData - User data including username, email, and password
 * @returns {Object} - Created user object with API token
 */
const registerUser = async (userData) => {
  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [
      { email: userData.email },
      { username: userData.username }
    ]
  });
  
  if (existingUser) {
    const field = existingUser.email === userData.email ? 'email' : 'username';
    throw new Error(`User with this ${field} already exists`);
  }
  
  // Create new user
  const user = new User({
    username: userData.username,
    email: userData.email
  });
  
  // Set password with salt
  user.setPassword(userData.password);
  
  // Generate API token
  const token = user.generateApiToken();
  
  // Save user
  await user.save();
  
  // Return user without sensitive data
  const userResponse = user.toObject();
  delete userResponse.passwordHash;
  delete userResponse.salt;
  
  return {
    user: userResponse,
    token
  };
};

/**
 * Authenticate a user
 * @param {string} identifier - Username or email
 * @param {string} password - User password
 * @returns {Object} - User object with API token
 */
const loginUser = async (identifier, password) => {
  // Check if identifier is email or username
  const isEmail = identifier.includes('@');
  
  // Find user with password fields included
  const user = await User.findOne({
    [isEmail ? 'email' : 'username']: identifier
  }).select('+passwordHash +salt');
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  // Check if user is active
  if (!user.active) {
    throw new Error('User account is inactive');
  }
  
  // Validate password
  if (!user.validatePassword(password)) {
    throw new Error('Invalid credentials');
  }
  
  // Generate new API token
  const token = user.generateApiToken();
  await user.save();
  
  // Return user without sensitive data
  const userResponse = user.toObject();
  delete userResponse.passwordHash;
  delete userResponse.salt;
  
  return {
    user: userResponse,
    token
  };
};

/**
 * Get user info by ID
 * @param {string} userId - User ID
 * @returns {Object} - User object
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object} - Updated user object
 */
const updateUser = async (userId, updateData) => {
  // Get user to update
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Update fields
  if (updateData.username) user.username = updateData.username;
  if (updateData.email) user.email = updateData.email;
  if (updateData.password) user.setPassword(updateData.password);
  
  // Admin only fields
  if (updateData.role && updateData.isAdminRequest) {
    user.role = updateData.role;
  }
  
  if (typeof updateData.active === 'boolean' && updateData.isAdminRequest) {
    user.active = updateData.active;
  }
  
  // Save updated user
  await user.save();
  
  // Return user without sensitive data
  const userResponse = user.toObject();
  delete userResponse.passwordHash;
  delete userResponse.salt;
  
  return userResponse;
};

/**
 * Update user score after solving a challenge
 * @param {string} userId - User ID
 * @param {string} challengeId - Challenge ID
 * @param {number} points - Points to add
 * @returns {Object} - Updated user object
 */
const updateUserScore = async (userId, challengeId, points) => {
  // Find user and update score and solved challenges atomically
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $inc: { score: points },
      $addToSet: { solvedChallenges: challengeId }
    },
    { new: true }
  );
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  updateUser,
  updateUserScore
};
