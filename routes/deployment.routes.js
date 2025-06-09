const express = require('express');
const router = express.Router();
const {
  deployChallenge,
  stopChallenge,
  getChallengeStatus
} = require('../controllers/deployment.controller');

// Admin middleware should be implemented and used here
const adminAuth = require('../middleware/adminAuth');

router.post('/challenges/:challengeId/deploy', adminAuth, deployChallenge);
router.post('/running-challenges/:runningChallengeId/stop', adminAuth, stopChallenge);
router.get('/running-challenges/:runningChallengeId/status', adminAuth, getChallengeStatus);

module.exports = router;