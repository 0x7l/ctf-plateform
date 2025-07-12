const Solve = require('../models/solve.model');
const logger = require('../utils/logger');

// @desc    Get all solves
// @route   GET /api/solves
// @access  Private/Admin
const getSolves = async (req, res) => {
  try {
    logger.info('Fetching all solves');
    const solves = await Solve.find().populate('challengeId');
    logger.info(`Found ${solves.length} solves`);
    res.status(200).json({
      success: true,
      count: solves.length,
      data: solves
    });
  } catch (error) {
    logger.error('Error in getSolves', { error });
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single solve
// @route   GET /api/solves/:id
// @access  Private/Admin
const getSolveById = async (req, res) => {
  try {
    logger.info(`Fetching solve with id: ${req.params.id}`);
    const solve = await Solve.findById(req.params.id).populate('challengeId');
    if (!solve) {
      logger.warn('Solve not found', { id: req.params.id });
      return res.status(404).json({
        success: false,
        error: 'Solve not found'
      });
    }
    logger.info('Found solve', { id: req.params.id });
    res.status(200).json({
      success: true,
      data: solve
    });
  } catch (error) {
    logger.error('Error in getSolveById', { error, id: req.params.id });
    if (error.kind === 'ObjectId') {
      logger.warn('Invalid solve ID format', { id: req.params.id });
      return res.status(400).json({
        success: false,
        error: 'Invalid solve ID format'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new solve
// @route   POST /api/solves
// @access  Private
const createSolve = async (req, res) => {
  try {
    logger.info('Create solve request body', { body: req.body, userId: req.user._id });
    // Use authenticated user's ID
    const solveData = {
      ...req.body,
      userId: req.user._id
    };
    const solve = await Solve.create(solveData);
    await solve.populate('challengeId');
    // Update user's score and solved challenges
    const authService = require('../services/auth.service');
    await authService.updateUserScore(
      req.user._id,
      solve.challengeId._id,
      solve.challengeId.points
    );
    logger.info('Solve created', { id: solve._id, userId: req.user._id });
    res.status(201).json({
      success: true,
      data: solve
    });
  } catch (error) {
    logger.error('Error in createSolve', { error, body: req.body, userId: req.user?._id });
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      logger.warn('Validation error in createSolve', { messages });
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update solve
// @route   PUT /api/solves/:id
// @access  Private/Admin
const updateSolve = async (req, res) => {
  try {
    logger.info(`Updating solve with id: ${req.params.id}`, { body: req.body });
    const solve = await Solve.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('challengeId');
    if (!solve) {
      logger.warn('Solve not found for update', { id: req.params.id });
      return res.status(404).json({
        success: false,
        error: 'Solve not found'
      });
    }
    logger.info('Solve updated', { id: req.params.id });
    res.status(200).json({
      success: true,
      data: solve
    });
  } catch (error) {
    logger.error('Error in updateSolve', { error, id: req.params.id, body: req.body });
    if (error.kind === 'ObjectId') {
      logger.warn('Invalid solve ID format', { id: req.params.id });
      return res.status(400).json({
        success: false,
        error: 'Invalid solve ID format'
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      logger.warn('Validation error in updateSolve', { messages });
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete solve
// @route   DELETE /api/solves/:id
// @access  Private/Admin
const deleteSolve = async (req, res) => {
  try {
    logger.info(`Deleting solve with id: ${req.params.id}`);
    const solve = await Solve.findByIdAndDelete(req.params.id);
    if (!solve) {
      logger.warn('Solve not found for delete', { id: req.params.id });
      return res.status(404).json({
        success: false,
        error: 'Solve not found'
      });
    }
    logger.info('Solve deleted', { id: req.params.id });
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error('Error in deleteSolve', { error, id: req.params.id });
    if (error.kind === 'ObjectId') {
      logger.warn('Invalid solve ID format', { id: req.params.id });
      return res.status(400).json({
        success: false,
        error: 'Invalid solve ID format'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get user's own solves
// @route   GET /api/solves/user
// @access  Private
const getUserSolves = async (req, res) => {
  try {
    logger.info(`Fetching solves for user: ${req.user._id}`);
    const solves = await Solve.find({ userId: req.user._id }).populate('challengeId');
    logger.info(`Found ${solves.length} solves for user`, { userId: req.user._id });
    res.status(200).json({
      success: true,
      count: solves.length,
      data: solves
    });
  } catch (error) {
    logger.error('Error in getUserSolves', { error, userId: req.user?._id });
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

module.exports = {
  getSolves,
  getSolveById,
  createSolve,
  updateSolve,
  deleteSolve,
  getUserSolves
};
