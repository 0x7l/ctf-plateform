const Solve = require('../models/solve.model');

// @desc    Get all solves
// @route   GET /api/solves
// @access  Private/Admin
const getSolves = async (req, res) => {
  try {
    console.log('Fetching all solves');
    const solves = await Solve.find().populate('challengeId');
    
    res.status(200).json({
      success: true,
      count: solves.length,
      data: solves
    });
  } catch (error) {
    console.log('Error in getSolves:', error);
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
    console.log(`Fetching solve with id: ${req.params.id}`);
    const solve = await Solve.findById(req.params.id).populate('challengeId');
    
    if (!solve) {
      return res.status(404).json({
        success: false,
        error: 'Solve not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: solve
    });
  } catch (error) {
    console.log('Error in getSolveById:', error);
    
    // Check if error is due to invalid ObjectId
    if (error.kind === 'ObjectId') {
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
    console.log('Create solve request body:', req.body);
    
    // Use authenticated user's ID
    const solveData = {
      ...req.body,
      userId: req.user._id
    };
    
    const solve = await Solve.create(solveData);
    
    // Populate the challengeId reference for the response
    await solve.populate('challengeId');
    
    // Update user's score and solved challenges
    const authService = require('../services/auth.service');
    await authService.updateUserScore(
      req.user._id,
      solve.challengeId._id,
      solve.challengeId.points
    );
    
    res.status(201).json({
      success: true,
      data: solve
    });
  } catch (error) {
    console.log('Error in createSolve:', error);
    
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

// @desc    Update solve
// @route   PUT /api/solves/:id
// @access  Private/Admin
const updateSolve = async (req, res) => {
  try {
    console.log(`Updating solve with id: ${req.params.id}`, req.body);
    const solve = await Solve.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('challengeId');
    
    if (!solve) {
      return res.status(404).json({
        success: false,
        error: 'Solve not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: solve
    });
  } catch (error) {
    console.log('Error in updateSolve:', error);
    
    // Check if error is due to invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid solve ID format'
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

// @desc    Delete solve
// @route   DELETE /api/solves/:id
// @access  Private/Admin
const deleteSolve = async (req, res) => {
  try {
    console.log(`Deleting solve with id: ${req.params.id}`);
    const solve = await Solve.findByIdAndDelete(req.params.id);
    
    if (!solve) {
      return res.status(404).json({
        success: false,
        error: 'Solve not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.log('Error in deleteSolve:', error);
    
    // Check if error is due to invalid ObjectId
    if (error.kind === 'ObjectId') {
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
    console.log(`Fetching solves for user: ${req.user._id}`);
    const solves = await Solve.find({ userId: req.user._id }).populate('challengeId');
    
    res.status(200).json({
      success: true,
      count: solves.length,
      data: solves
    });
  } catch (error) {
    console.log('Error in getUserSolves:', error);
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
