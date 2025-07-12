const DbAdmin = require('../models/dbAdmin.model');
const { v4: uuidv4 } = require('uuid');
const dbService = require('../services/database.service');
const { generateDbInitScript } = require('../utils/dbScriptGenerator');
const logger = require('../utils/logger'); // <-- Add this

// @desc    Get all database instances
// @route   GET /api/db-admin
// @access  Public (would be restricted in production)
const getAllDbInstances = async (req, res) => {
  try {
    logger.info('Fetching all database instances');
    const dbInstances = await DbAdmin.find();
    logger.info(`Found ${dbInstances.length} database instances`);
    res.status(200).json({
      success: true,
      count: dbInstances.length,
      data: dbInstances
    });
  } catch (error) {
    logger.error('Error in getAllDbInstances', { error });
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
    logger.info(`Fetching database instance with id: ${req.params.id}`);
    const dbInstance = await DbAdmin.findById(req.params.id);

    if (!dbInstance) {
      logger.warn('Database instance not found', { id: req.params.id });
      return res.status(404).json({
        success: false,
        error: 'Database instance not found'
      });
    }

    logger.info('Found database instance', { id: req.params.id });
    res.status(200).json({
      success: true,
      data: dbInstance
    });
  } catch (error) {
    logger.error('Error in getDbInstanceById', { error, id: req.params.id });

    // Check if error is due to invalid ObjectId
    if (error.kind === 'ObjectId') {
      logger.warn('Invalid database instance ID format', { id: req.params.id });
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
    logger.info('Create database instance request body', { body: req.body });
    const dbInstance = await DbAdmin.create(req.body);

    logger.info('Database instance created', { id: dbInstance._id });
    res.status(201).json({
      success: true,
      data: dbInstance
    });
  } catch (error) {
    logger.error('Error in createDbInstance', { error, body: req.body });

    // Check if error is a validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);

      logger.warn('Validation error in createDbInstance', { messages });
      return res.status(400).json({
        success: false,
        error: messages
      });
    }

    // Check if error is a duplicate key error
    if (error.code === 11000) {
      logger.warn('Instance name already exists', { body: req.body });
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
    logger.info(`Updating database instance with id: ${req.params.id}`, { body: req.body });
    const dbInstance = await DbAdmin.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!dbInstance) {
      logger.warn('Database instance not found for update', { id: req.params.id });
      return res.status(404).json({
        success: false,
        error: 'Database instance not found'
      });
    }

    logger.info('Database instance updated', { id: req.params.id });
    res.status(200).json({
      success: true,
      data: dbInstance
    });
  } catch (error) {
    logger.error('Error in updateDbInstance', { error, id: req.params.id, body: req.body });

    // Check if error is due to invalid ObjectId
    if (error.kind === 'ObjectId') {
      logger.warn('Invalid database instance ID format', { id: req.params.id });
      return res.status(400).json({
        success: false,
        error: 'Invalid database instance ID format'
      });
    }

    // Check if error is a validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);

      logger.warn('Validation error in updateDbInstance', { messages });
      return res.status(400).json({
        success: false,
        error: messages
      });
    }

    // Check if error is a duplicate key error
    if (error.code === 11000) {
      logger.warn('Instance name already exists', { body: req.body });
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
    logger.info(`Deleting database instance with id: ${req.params.id}`);
    const dbInstance = await DbAdmin.findByIdAndDelete(req.params.id);

    if (!dbInstance) {
      logger.warn('Database instance not found for delete', { id: req.params.id });
      return res.status(404).json({
        success: false,
        error: 'Database instance not found'
      });
    }

    logger.info('Database instance deleted', { id: req.params.id });
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error('Error in deleteDbInstance', { error, id: req.params.id });

    // Check if error is due to invalid ObjectId
    if (error.kind === 'ObjectId') {
      logger.warn('Invalid database instance ID format', { id: req.params.id });
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
      logger.warn('Challenge ID is required to create DB user', { body: req.body });
      return res.status(400).json({
        success: false,
        error: 'Challenge ID is required'
      });
    }

    logger.info('Creating DB user for challenge', { dbInstanceId: req.params.id, challengeId, accessLevel });
    const newUser = await dbService.createDbUserForChallenge(
      req.params.id,
      challengeId,
      accessLevel || 'readwrite'
    );

    if (!newUser) {
      logger.warn('Database instance not found or error creating user', { dbInstanceId: req.params.id, challengeId });
      return res.status(404).json({
        success: false,
        error: 'Database instance not found or error creating user'
      });
    }

    logger.info('Database user created', { dbInstanceId: req.params.id, challengeId, username: newUser.username });
    res.status(201).json({
      success: true,
      data: newUser
    });
  } catch (error) {
    logger.error('Error in createDbUser', { error, dbInstanceId: req.params.id, body: req.body });
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

    logger.info('Fetching DB init script', { dbInstanceId: id, challengeId });

    // Find the database instance
    const dbInstance = await DbAdmin.findById(id);

    if (!dbInstance) {
      logger.warn('Database instance not found for init script', { dbInstanceId: id });
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
      logger.warn('Database user for this challenge not found', { dbInstanceId: id, challengeId });
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

    logger.info('Database init script generated', { dbInstanceId: id, challengeId });
    res.status(200).json({
      success: true,
      data: {
        databaseType: dbInstance.databaseType,
        script: initScript
      }
    });
  } catch (error) {
    logger.error('Error in getDatabaseInitScript', { error, dbInstanceId: req.params.id, challengeId: req.params.challengeId });
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
