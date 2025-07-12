const User = require('../models/user.model');
const logger = require('../utils/logger');

/**
 * @desc    Get CTF leaderboard
 * @route   GET /api/leaderboard
 * @access  Public
 */
exports.getLeaderboard = async (req, res) => {
  try {
    // Get query parameters for pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    logger.info('Fetching leaderboard', { page, limit });

    // Find all active users, sort by score (descending)
    const users = await User.find({ active: true })
      .select('username score solvedChallenges')
      .sort({ score: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await User.countDocuments({ active: true });

    // Calculate rankings (including ties)
    let currentRank = 0;
    let currentScore = -1;
    let currentCount = 0;

    const leaderboard = users.map(user => {
      // Handle ties (same score gets same rank)
      if (user.score !== currentScore) {
        currentRank += currentCount;
        currentScore = user.score;
        currentCount = 1;
      } else {
        currentCount++;
      }

      return {
        rank: currentRank,
        username: user.username,
        score: user.score,
        solvedCount: user.solvedChallenges.length
      };
    });

    logger.info('Leaderboard fetched', { count: users.length });

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: leaderboard
    });
  } catch (error) {
    logger.error('Error in getLeaderboard', { error });
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

/**
 * @desc    Get detailed stats for a user
 * @route   GET /api/leaderboard/:username
 * @access  Public
 */
exports.getUserStats = async (req, res) => {
  try {
    const { username } = req.params;

    logger.info('Fetching stats for user', { username });

    // Find user and populate solved challenges
    const user = await User.findOne({ username, active: true })
      .select('username score solvedChallenges')
      .populate({
        path: 'solvedChallenges',
        populate: {
          path: 'challengeId',
          select: 'title category difficulty points'
        }
      });

    if (!user) {
      logger.warn('User not found', { username });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get all users and find user's rank
    const allUsers = await User.find({ active: true })
      .select('username score')
      .sort({ score: -1 });

    let userRank = 0;
    let currentRank = 0;
    let currentScore = -1;
    let currentCount = 0;

    for (const rankedUser of allUsers) {
      if (rankedUser.score !== currentScore) {
        currentRank += currentCount;
        currentScore = rankedUser.score;
        currentCount = 1;
      } else {
        currentCount++;
      }

      if (rankedUser.username === username) {
        userRank = currentRank;
        break;
      }
    }

    // Create a breakdown of challenges by category
    const categoryBreakdown = {};
    user.solvedChallenges.forEach(solve => {
      const challenge = solve.challengeId;
      if (!categoryBreakdown[challenge.category]) {
        categoryBreakdown[challenge.category] = 0;
      }
      categoryBreakdown[challenge.category] += challenge.points;
    });

    // Create a breakdown by difficulty
    const difficultyBreakdown = {};
    user.solvedChallenges.forEach(solve => {
      const challenge = solve.challengeId;
      if (!difficultyBreakdown[challenge.difficulty]) {
        difficultyBreakdown[challenge.difficulty] = 0;
      }
      difficultyBreakdown[challenge.difficulty]++;
    });

    logger.info('User stats fetched', { username, rank: userRank });

    res.status(200).json({
      success: true,
      data: {
        username: user.username,
        score: user.score,
        rank: userRank,
        solvedCount: user.solvedChallenges.length,
        categoryBreakdown,
        difficultyBreakdown,
        recentSolves: user.solvedChallenges.slice(0, 5).map(solve => ({
          title: solve.challengeId.title,
          category: solve.challengeId.category,
          difficulty: solve.challengeId.difficulty,
          points: solve.challengeId.points
        }))
      }
    });
  } catch (error) {
    logger.error('Error in getUserStats', { error, username: req.params.username });
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};