const express = require('express');
const router = express.Router();
const {
  createChallenge,
  getChallenges,
  getChallengeById,
  updateChallenge,
  searchChallenges,
  deleteChallenge,
  stopChallenge,
  getChallengeLogs,
  getContainerStats,
  deployChallenge
} = require('../controllers/challenge.controller');
const { validateChallengeInput } = require('../middleware/validator');
const { authenticate, authorize } = require('../middleware/auth');

//Public routes - all users can view challenges
router.get('/', getChallenges);
router.get('/:id', getChallengeById);
router.post('/search', searchChallenges);

//Challenge deployment operations - admin only
router.post('/:id/deploy', authenticate, authorize('admin'), deployChallenge);
router.post('/:id/stop', authenticate, authorize('admin'), stopChallenge);

//Challenge monitoring routes - authenticated users only
router.get('/:id/logs', authenticate, getChallengeLogs);
router.get('/:id/stats', authenticate, getContainerStats);

//Admin routes - only admins can create/update/delete challenges
router.post('/', authenticate, authorize('admin'), validateChallengeInput, createChallenge);
router.put('/:id', authenticate, authorize('admin'), validateChallengeInput, updateChallenge);
router.delete('/:id', authenticate, authorize('admin'), deleteChallenge);

module.exports = router;