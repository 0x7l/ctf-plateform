const express = require('express');
const router = express.Router();
const {
  getRunningChallenges,
  getRunningChallengeById,
  createRunningChallenge,
  updateRunningChallenge,
  deleteRunningChallenge
} = require('../controllers/ctfRunningChallenge.controller');
const { validateRunningChallengeInput } = require('../middleware/validator');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes - users can view running challenges
router.get('/', getRunningChallenges);
router.get('/:id', getRunningChallengeById);

// Admin routes - only admins can create/update/delete running challenges
router.post('/', authenticate, authorize(['admin']), validateRunningChallengeInput, createRunningChallenge);
router.put('/:id', authenticate, authorize(['admin']), validateRunningChallengeInput, updateRunningChallenge);
router.delete('/:id', authenticate, authorize(['admin']), deleteRunningChallenge);

module.exports = router;
