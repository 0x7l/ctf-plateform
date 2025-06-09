const DbAdmin = require('../models/dbAdmin.model');
const { v4: uuidv4 } = require('uuid');
const dbService = require('../services/database.service');
const { generateDbInitScript } = require('../utils/dbScriptGenerator');

// @desc    Get all database instances
// @route   GET /api/db-admin
// @access  Public (would be restricted in production)
const getAllDbInstances = async (req, res) => {
  try {
    console.log('Fetching all database instances');
    const dbInstances = await DbAdmin.find();
    
    res.status(200).json({
      success: true,
      count: dbInstances.length,
      data: dbInstances
    });
  } catch (error) {
    console.log('Error in getAllDbInstances:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single database instance
// @route   GET /api/db-admin/:id
// @access  Public (would be restricted in production)
const getDbInstanceById = async (req, res) => {
  try {
    console.log(`Fetching database instance with id: ${req.params.id}`);
    const dbInstance = await DbAdmin.findById(req.params.id);
    
    if (!dbInstance) {
      return res.status(404).json({
        success: false,
        error: 'Database instance not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: dbInstance
    });
  } catch (error) {
    console.log('Error in getDbInstanceById:', error);
    
    // Check if error is due to invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid database instance ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new database instance
// @route   POST /api/db-admin
// @access  Public (would be restricted in production)
const createDbInstance = async (req, res) => {
  try {
    console.log('Create database instance request body:', req.body);
    const dbInstance = await DbAdmin.create(req.body);
    
    res.status(201).json({
      success: true,
      data: dbInstance
    });
  } catch (error) {
    console.log('Error in createDbInstance:', error);
    
    // Check if error is a validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    
    // Check if error is a duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Instance name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update database instance
// @route   PUT /api/db-admin/:id
// @access  Public (would be restricted in production)
const updateDbInstance = async (req, res) => {
  try {
    console.log(`Updating database instance with id: ${req.params.id}`, req.body);
    const dbInstance = await DbAdmin.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!dbInstance) {
      return res.status(404).json({
        success: false,
        error: 'Database instance not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: dbInstance
    });
  } catch (error) {
    console.log('Error in updateDbInstance:', error);
    
    // Check if error is due to invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid database instance ID format'
      });
    }
    
    // Check if error is a validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    
    // Check if error is a duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Instance name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete database instance
// @route   DELETE /api/db-admin/:id
// @access  Public (would be restricted in production)
const deleteDbInstance = async (req, res) => {
  try {
    console.log(`Deleting database instance with id: ${req.params.id}`);
    const dbInstance = await DbAdmin.findByIdAndDelete(req.params.id);
    
    if (!dbInstance) {
      return res.status(404).json({
        success: false,
        error: 'Database instance not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.log('Error in deleteDbInstance:', error);
    
    // Check if error is due to invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid database instance ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create a new database user for a challenge
// @route   POST /api/db-admin/:id/users
// @access  Public (would be restricted in production)
const createDbUser = async (req, res) => {
  try {
    const { challengeId, accessLevel } = req.body;
    
    if (!challengeId) {
      return res.status(400).json({
        success: false,
        error: 'Challenge ID is required'
      });
    }
    
    const newUser = await dbService.createDbUserForChallenge(
      req.params.id,
      challengeId,
      accessLevel || 'readwrite'
    );
    
    if (!newUser) {
      return res.status(404).json({
        success: false,
        error: 'Database instance not found or error creating user'
      });
    }
    
    res.status(201).json({
      success: true,
      data: newUser
    });
  } catch (error) {
    console.log('Error in createDbUser:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get initialization script for a database user
// @route   GET /api/db-admin/:id/users/:challengeId/init-script
// @access  Public (would be restricted in production)
const getDatabaseInitScript = async (req, res) => {
  try {
    const { id, challengeId } = req.params;
    
    // Find the database instance
    const dbInstance = await DbAdmin.findById(id);
    
    if (!dbInstance) {
      return res.status(404).json({
        success: false,
        error: 'Database instance not found'
      });
    }
    
    // Find the user configuration for the challenge
    const userConfig = dbInstance.users.find(
      user => user.createdFor.toString() === challengeId
    );
    
    if (!userConfig) {
      return res.status(404).json({
        success: false,
        error: 'Database user for this challenge not found'
      });
    }
    
    // Generate initialization script
    const initScript = generateDbInitScript({
      databaseType: dbInstance.databaseType,
      databaseName: userConfig.databaseName,
      username: userConfig.username,
      password: userConfig.password
    });
    
    res.status(200).json({
      success: true,
      data: {
        databaseType: dbInstance.databaseType,
        script: initScript
      }
    });
  } catch (error) {
    console.log('Error in getDatabaseInitScript:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

module.exports = {
  getAllDbInstances,
  getDbInstanceById,
  createDbInstance,
  updateDbInstance,
  deleteDbInstance,
  createDbUser,
  getDatabaseInitScript
};
