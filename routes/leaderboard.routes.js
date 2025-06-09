const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');

// Public routes
router.get('/', leaderboardController.getLeaderboard);
router.get('/:username', leaderboardController.getUserStats);

module.exports = router;
