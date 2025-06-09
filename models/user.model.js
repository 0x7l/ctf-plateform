const mongoose = require('mongoose');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    select: false
  },
  salt: {
    type: String,
    select: false
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  apiToken: {
    token: String,
    createdAt: Date
  },
  score: {
    type: Number,
    default: 0
  },
  solvedChallenges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CtfRunningChallenge'
  }],
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Method to set password
UserSchema.methods.setPassword = function(password) {
  // Create a unique salt for a particular user
  this.salt = crypto.randomBytes(16).toString('hex');
  
  // Hash user's salt and password with 1000 iterations, 64 length and sha512 digest
  this.passwordHash = crypto.pbkdf2Sync(
    password, 
    this.salt, 
    1000, 
    64, 
    'sha512'
  ).toString('hex');
};

// Method to check password validity
UserSchema.methods.validatePassword = function(password) {
  const hash = crypto.pbkdf2Sync(
    password,
    this.salt,
    1000,
    64,
    'sha512'
  ).toString('hex');
  
  return this.passwordHash === hash;
};

// Method to generate API token
UserSchema.methods.generateApiToken = function() {
  // Generate random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Save token with creation time
  this.apiToken = {
    token,
    createdAt: Date.now()
  };
  
  return token;
};

// Static method to check if API token is valid
UserSchema.statics.validateApiToken = async function(token) {
  // Find user with this token
  const user = await this.findOne({ 'apiToken.token': token });
  
  if (!user) {
    return null;
  }
  
  // Check if token is expired (30 days validity)
  const tokenCreatedAt = new Date(user.apiToken.createdAt);
  const expirationDate = new Date(tokenCreatedAt);
  expirationDate.setDate(expirationDate.getDate() + 30);
  
  if (Date.now() > expirationDate) {
    // Token expired
    user.apiToken = undefined;
    await user.save();
    return null;
  }
  
  return user;
};

module.exports = mongoose.model('User', UserSchema);
