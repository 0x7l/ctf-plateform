const CtfRunningChallenge = require('../models/ctfRunningChallenge.model');
const Challenge = require('../models/challenge.model');
const DbAdmin = require('../models/dbAdmin.model');
const fetch = require('node-fetch');
const challengeService = require('../services/challenge.service');

// @desc    Get all running challenges
// @route   GET /api/ctf-running
// @access  Public
const getRunningChallenges = async (req, res) => {
  try {
    console.log('Fetching all running challenges');
    const runningChallenges = await CtfRunningChallenge.find().populate('challengeId');
    
    res.status(200).json({
      success: true,
      count: runningChallenges.length,
      data: runningChallenges
    });
  } catch (error) {
    console.log('Error in getRunningChallenges:', error);
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
    console.log(`Fetching running challenge with id: ${req.params.id}`);
    const runningChallenge = await CtfRunningChallenge.findById(req.params.id).populate('challengeId');
    
    if (!runningChallenge) {
      return res.status(404).json({
        success: false,
        error: 'Running challenge not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: runningChallenge
    });
  } catch (error) {
    console.log('Error in getRunningChallengeById:', error);
    
    // Check if error is due to invalid ObjectId
    if (error.kind === 'ObjectId') {
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
    console.log('Create running challenge request body:', req.body);
    
    try {
      // Use the challenge service to launch the challenge
      const runningChallenge = await challengeService.launchChallenge(req.body);
      
      res.status(201).json({
        success: true,
        data: runningChallenge
      });
    } catch (error) {
      console.log('Error in createRunningChallenge service call:', error);
      
      if (error.message === 'Base challenge not found') {
        return res.status(404).json({
          success: false,
          error: 'Base challenge not found'
        });
      }
      
      throw error; // Pass to the outer catch block for standard error handling
    }
  } catch (error) {
    console.log('Error in createRunningChallenge:', error);
    
    // Check if error is a validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      
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
    console.log(`Updating running challenge with id: ${req.params.id}`, req.body);
    const runningChallenge = await CtfRunningChallenge.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('challengeId');
    
    if (!runningChallenge) {
      return res.status(404).json({
        success: false,
        error: 'Running challenge not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: runningChallenge
    });
  } catch (error) {
    console.log('Error in updateRunningChallenge:', error);
    
    // Check if error is due to invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid running challenge ID format'
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
    console.log(`Deleting running challenge with id: ${req.params.id}`);
    
    try {
      // Use the challenge service to terminate the challenge
      await challengeService.terminateChallenge(req.params.id);
      
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (error) {
      console.log('Error in deleteRunningChallenge service call:', error);
      
      if (error.message === 'Running challenge not found') {
        return res.status(404).json({
          success: false,
          error: 'Running challenge not found'
        });
      }
      
      throw error; // Pass to the outer catch block for standard error handling
    }
  } catch (error) {
    console.log('Error in deleteRunningChallenge:', error);
    
    // Check if error is due to invalid ObjectId
    if (error.kind === 'ObjectId') {
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