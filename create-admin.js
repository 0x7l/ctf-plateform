#!/usr/bin/env node

/**
 * Script to create an admin user for the CTF platform
 * 
 * Usage: 
 * NODE_ENV=development node create-admin.js admin@example.com AdminPassword123
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');

// Load environment variables
dotenv.config();

// Import User model
let User;

// Validate arguments
if (process.argv.length < 4) {
  console.error('Usage: node create-admin.js <email> <password>');
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];

// Email validation
const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
if (!emailRegex.test(email)) {
  console.error('Invalid email format');
  process.exit(1);
}

// Password validation
if (password.length < 8) {
  console.error('Password must be at least 8 characters long');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected...');
    init();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function init() {
  try {
    // Dynamically import the model to avoid issues with mongoose models
    const userPath = './models/user.model.js';
    const userModel = require(userPath);
    User = userModel;

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ 
      email, 
      role: 'admin' 
    });

    if (existingAdmin) {
      console.log('Admin user already exists with this email');
      process.exit(0);
    }

    // Create admin user
    const username = `admin_${Math.floor(Math.random() * 10000)}`;
    const admin = new User({
      username,
      email,
      role: 'admin',
      active: true
    });

    // Set password
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.pbkdf2Sync(
      password, 
      salt, 
      1000, 
      64, 
      'sha512'
    ).toString('hex');

    admin.salt = salt;
    admin.passwordHash = passwordHash;

    // Generate API token
    const token = crypto.randomBytes(32).toString('hex');
    admin.apiToken = {
      token,
      createdAt: Date.now()
    };

    // Save user
    await admin.save();

    console.log('==============================================');
    console.log('Admin user created successfully!');
    console.log('==============================================');
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log(`API Token: ${token}`);
    console.log('==============================================');
    console.log('Make sure to save this information securely!');
    console.log('==============================================');

    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user:', err);
    process.exit(1);
  }
}
