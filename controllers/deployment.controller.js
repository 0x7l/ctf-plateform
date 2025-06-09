const Challenge = require('../models/challenge.model');
const CtfRunningChallenge = require('../models/ctfRunningChallenge.model');
const deploymentService = require('../services/deployment.service');

const deployChallenge = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { flag, points, hints } = req.body;

    // Validate challenge exists
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        error: 'Challenge not found'
      });
    }

    // Create running challenge instance
    const runningChallenge = await CtfRunningChallenge.create({
      challengeId,
      flag,
      points,
      hints,
      isActive: true
    });

    // Deploy the challenge
    const deploymentInfo = await deploymentService.deployFromGithub(
      runningChallenge, 
      challenge
    );

    // Update running challenge with deployment info
    const updatedChallenge = await CtfRunningChallenge.findByIdAndUpdate(
      runningChallenge._id,
      deploymentInfo,
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedChallenge
    });

  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Deployment failed'
    });
  }
};

const stopChallenge = async (req, res) => {
  try {
    const { runningChallengeId } = req.params;

    const runningChallenge = await CtfRunningChallenge.findById(runningChallengeId);
    if (!runningChallenge) {
      return res.status(404).json({
        success: false,
        error: 'Running challenge not found'
      });
    }

    await deploymentService.stopAndRemove(runningChallenge);

    // Update challenge status
    runningChallenge.deployed = false;
    runningChallenge.isActive = false;
    runningChallenge.dockerContainer = '';
    runningChallenge.dockerPort = null;
    runningChallenge.deploymentURL = '';
    await runningChallenge.save();

    res.status(200).json({
      success: true,
      message: 'Challenge stopped successfully'
    });

  } catch (error) {
    console.error('Stop challenge error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to stop challenge'
    });
  }
};

const getChallengeStatus = async (req, res) => {
  try {
    const { runningChallengeId } = req.params;
    
    const runningChallenge = await CtfRunningChallenge.findById(runningChallengeId)
      .populate('challengeId');

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
    res.status(500).json({
      success: false,
      error: 'Failed to get challenge status'
    });
  }
};

module.exports = {
  deployChallenge,
  stopChallenge,
  getChallengeStatus
};