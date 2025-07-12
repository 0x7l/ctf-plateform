const CtfRunningChallenge = require('../models/ctfRunningChallenge.model');
const Challenge = require('../models/challenge.model');
const DbAdmin = require('../models/dbAdmin.model');
const fetch = require('node-fetch');
const challengeService = require('../services/challenge.service');
const logger = require('../utils/logger');

// @desc    Get all running challenges
// @route   GET /api/ctf-running
// @access  Public
const getRunningChallenges = async (req, res) => {
  try {
    logger.info('Fetching all running challenges');
    const runningChallenges = await CtfRunningChallenge.find().populate('challengeId');
    logger.info(`Found ${runningChallenges.length} running challenges`);
    res.status(200).json({
      success: true,
      count: runningChallenges.length,
      data: runningChallenges
    });
  } catch (error) {
    logger.error('Error in getRunningChallenges', { error });
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single running challenge
// @route   GET /api/ctf-running/:id
// @access  Public
const getRunningChallengeById = async (req, res) => {
  try {
    logger.info(`Fetching running challenge with id: ${req.params.id}`);
    const runningChallenge = await CtfRunningChallenge.findById(req.params.id).populate('challengeId');
    if (!runningChallenge) {
      logger.warn('Running challenge not found', { id: req.params.id });
      return res.status(404).json({
        success: false,
        error: 'Running challenge not found'
      });
    }
    logger.info('Found running challenge', { id: req.params.id });
    res.status(200).json({
      success: true,
      data: runningChallenge
    });
  } catch (error) {
    logger.error('Error in getRunningChallengeById', { error, id: req.params.id });
    if (error.kind === 'ObjectId') {
      logger.warn('Invalid running challenge ID format', { id: req.params.id });
      return res.status(400).json({
        success: false,
        error: 'Invalid running challenge ID format'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new running challenge
// @route   POST /api/ctf-running
// @access  Public
const createRunningChallenge = async (req, res) => {
  try {
    logger.info('Create running challenge request', { body: req.body });
    try {
      const runningChallenge = await challengeService.launchChallenge(req.body);
      logger.info('Running challenge created', { id: runningChallenge._id });
      res.status(201).json({
        success: true,
        data: runningChallenge
      });
    } catch (error) {
      logger.error('Error in createRunningChallenge service call', { error });
      if (error.message === 'Base challenge not found') {
        logger.warn('Base challenge not found', { body: req.body });
        return res.status(404).json({
          success: false,
          error: 'Base challenge not found'
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Error in createRunningChallenge', { error });
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      logger.warn('Validation error in createRunningChallenge', { messages });
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

// @desc    Update running challenge
// @route   PUT /api/ctf-running/:id
// @access  Public
const updateRunningChallenge = async (req, res) => {
  try {
    logger.info(`Updating running challenge with id: ${req.params.id}`, { body: req.body });
    const runningChallenge = await CtfRunningChallenge.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('challengeId');
    if (!runningChallenge) {
      logger.warn('Running challenge not found for update', { id: req.params.id });
      return res.status(404).json({
        success: false,
        error: 'Running challenge not found'
      });
    }
    logger.info('Running challenge updated', { id: req.params.id });
    res.status(200).json({
      success: true,
      data: runningChallenge
    });
  } catch (error) {
    logger.error('Error in updateRunningChallenge', { error, id: req.params.id });
    if (error.kind === 'ObjectId') {
      logger.warn('Invalid running challenge ID format', { id: req.params.id });
      return res.status(400).json({
        success: false,
        error: 'Invalid running challenge ID format'
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      logger.warn('Validation error in updateRunningChallenge', { messages });
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

// @desc    Delete running challenge
// @route   DELETE /api/ctf-running/:id
// @access  Public
const deleteRunningChallenge = async (req, res) => {
  try {
    logger.info(`Deleting running challenge with id: ${req.params.id}`);
    try {
      await challengeService.terminateChallenge(req.params.id);
      logger.info('Running challenge terminated', { id: req.params.id });
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (error) {
      logger.error('Error in deleteRunningChallenge service call', { error, id: req.params.id });
      if (error.message === 'Running challenge not found') {
        logger.warn('Running challenge not found for delete', { id: req.params.id });
        return res.status(404).json({
          success: false,
          error: 'Running challenge not found'
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Error in deleteRunningChallenge', { error, id: req.params.id });
    if (error.kind === 'ObjectId') {
      logger.warn('Invalid running challenge ID format', { id: req.params.id });
      return res.status(400).json({
        success: false,
        error: 'Invalid running challenge ID format'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

module.exports = {
  getRunningChallenges,
  getRunningChallengeById,
  createRunningChallenge,
  updateRunningChallenge,
  deleteRunningChallenge
};