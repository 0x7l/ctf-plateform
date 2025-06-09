const {exec, spawn} = require('child_process');
const fs = require('fs');
const path = require('path');
const Challenge = require('../models/challenge.model');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const TEMP_DIR = path.join('/tmp', 'ctf-deployments');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Helper functions
async function executeCommand(command, challenge, logPrefix = '') {
  return new Promise((resolve, reject) => {
    const child = exec(command, (error, stdout, stderr) => {
      if (error){
        challenge.logs.push(`[ERROR] ${logPrefix}: ${stderr || error.message}`);
        reject(new Error(stderr || error.message));
        return;
      }
      challenge.logs.push(`[SUCCESS] ${logPrefix}`);
      resolve(stdout);
    });

    child.stdout.on('data', (data) => {
      challenge.logs.push(data.toString());
    });

    child.stderr.on('data', (data) => {
      challenge.logs.push(data.toString());
    });

    const saveInterval = setInterval(async () => {
      await challenge.save();
    }, 2000);

    child.on('exit', () => {
      clearInterval(saveInterval);
      challenge.save();
    });
  });
}

async function stopContainer(containerId) {
  return new Promise((resolve, reject) => {
    exec(`docker stop ${containerId} && docker rm ${containerId}`,
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        resolve(stdout);
      });
  });
}

async function getContainerStats(containerId) {
  return new Promise((resolve) => {
    const stats = {};
    const docker = spawn('docker', [
      'stats',
      containerId,
      '--no-stream',
      '--format',
      '{"cpu": "{{.CPUPerc}}", "memory":"{{.MemPerc}}","network":"{{.NetIO}}"}'
    ]);

    docker.stdout.on('data', (data) => {
      try {
        Object.assign(stats, JSON.parse(data.toString()));
      }
      catch (e) {
        stats.error = 'Failed to parse stats';
      }
    });
    docker.on('close', () => {
      resolve(stats);
    });
  });
}

function isValidGitHubUrl(url){
  return /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(\.git)?$/.test(url);
}

function handleControllerError(res, error) {
  console.error(error);
  if (error.name === 'ValidationError'){
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({errors});
  }
  res.status(500).json({
    error: 'Server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

// Controller Functions
async function createChallenge(req, res) {
  try {
    // Validate user context
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        error: 'Authetication required',
        details: 'Valid user context not found',
      });
    }

    //Validate admin role
    if (req.user.role !== 'admin'){
      return res.status(403).json({
        error: 'Forbidden',
        details: 'Admin privilege required'
      });
    }

    //Validate required fields
    const requiredFields = ['title', 'description', 'category', 'difficulty', 'points'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          error: 'Validation failed',
          details: `${field} is required`
        })
      }
    }

    const challenge = new Challenge({
      title:req.body.title,
      description: req.body.description,
      category: req.body.category,
      difficulty: req.body.difficulty,
      points: req.body.points,
      deployable: req.body.deployable || false
    });

    if (req.body.deployable) {
      challenge.github_url = req.body.github_url;
      challenge.port = req.body.port;
      challenge.internalPort = req.body.internalPort;
    }

    console.log('Creating challenge:', challenge);
    await challenge.save();
    res.status(201).json(challenge);
  } catch (error) {
    console.error('Create challenge error:', error);
    res.status(500).json({
      error: 'Error creating challenge',
      details: error.message
    });
  }
}

// For getting multiple challenges with filters
async function getChallenges(req, res) {
  try {
    const { category, difficulty, deployable, page = 1, limit = 10 } = req.query;
    const filter = {};

    // Apply filters
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (deployable) filter.deployable = deployable === 'true';

    // Add pagination
    const skip = (page - 1) * limit;

    const [challenges, total] = await Promise.all([
      Challenge.find(filter)
        .select('-logs')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Challenge.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        challenges,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    handleControllerError(res, error);
  }
}

// For getting a single challenge by ID
async function getChallengeById(req, res) {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid challenge ID format'
      });
    }

    const challenge = await Challenge.findById(id)
      .select('-logs');

    if (!challenge) {
      return res.status(404).json({
        success: false,
        error: 'Challenge not found'
      });
    }

    // Get container stats if challenge is deployed
    if (challenge.deploymentStatus === 'active' && challenge.containerId) {
      const containerStats = await getContainerStats(challenge.containerId);
      return res.json({
        success: true,
        data: {
          ...challenge.toObject(),
          containerStats
        }
      });
    }

    res.json({
      success: true,
      data: challenge
    });

  } catch (error) {
    handleControllerError(res, error);
  }
}

async function updateChallenge(req, res) {
  try {
    const challenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    res.json(challenge);
  } catch (error) {
    handleControllerError(res, error);
  }
}

async function searchChallenges(req, res) {
  try {
    const { 
      query, 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      fields = ['title', 'description', 'category', 'tags']
    } = req.body;

    // Validate search query
    if (!query || query.length < 2) {
      return res.status(400).json({ 
        success: false,
        error: 'Search query must be at least 2 characters long' 
      });
    }

    // Sanitize and build search criteria
    const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(sanitizedQuery, 'i');

    // Build dynamic search conditions
    const searchConditions = fields.reduce((acc, field) => {
      if (field === 'tags') {
        acc.push({ tags: { $in: [regex] } });
      } else {
        acc.push({ [field]: regex });
      }
      return acc;
    }, []);

    // Build query with pagination
    const skip = (page - 1) * limit;
    
    // Execute search query
    const [challenges, total] = await Promise.all([
      Challenge.find({ $or: searchConditions })
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .select('-logs'),
      Challenge.countDocuments({ $or: searchConditions })
    ]);

    // Return paginated results
    res.json({
      success: true,
      data: {
        challenges,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        },
        query: {
          search: query,
          sortBy,
          sortOrder,
          fields
        }
      }
    });

  } catch (error) {
    handleControllerError(res, error);
  }
}

async function deleteChallenge(req, res) {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({error: 'Challenge not found'});
    }

    if (challenge.deploymentStatus === 'active' && challenge.containerId) {
      await stopContainer(challenge.containerId);
    }

    await challenge.deleteOne({_id: challenge._id});
    
    res.json({
      success: true,
      message: 'Challenge deleted successfully'
    });
  } catch (error) {
    handleControllerError(res, error);
  }
}

async function deployChallenge(req, res) {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if(!challenge) {
      return res.status(404).json({error: 'Challenge not found' });
    }

    if (!challenge.deployable) {
      return res.status(400).json({error: 'Challenge is not marked as deployable'});
    }

    if (!challenge.github_url) {
      return res.status(400).json({error: 'Github URL is required for deployment'});
    }

    challenge.deploymentStatus = 'building';
    challenge.logs = [`[${new Date().toISOString()}] Starting deployment...`];
    await challenge.save();

    const deploymentDir = path.join(TEMP_DIR, `challenge-${challenge._id}-${uuidv4()}`);

    await executeCommand(
      `git clone ${challenge.github_url} ${deploymentDir}`,
      challenge,
      'Cloning repository'
    );

    const imageName = `ctf-${challenge._id}`;
    await executeCommand(
      `docker build -t ${imageName} ${deploymentDir}`,
      challenge,
      'Building Docker image'
    );

    const portMapping = `${challenge.port}:${challenge.internalPort}`;
    const containerName = `ctf-container-${challenge._id}`;
    const containerId = await executeCommand(
      `docker run -d -p ${portMapping} --name ${containerName} ${imageName}`,
      challenge,
      'Starting container'
    );

    challenge.deploymentStatus = 'active';
    challenge.containerId = containerId.trim();
    challenge.deployedAt = new Date();
    await challenge.save();

    res.json({
      success: true,
      port: challenge.port,
      containerId: challenge.containerId,
      logs: challenge.logs
    });

  } catch (error) {
    if (req.params.id) {
      const challenge = await Challenge.findById(req.params.id);
      if (challenge) {
        challenge.deploymentStatus = 'failed';
        challenge.logs.push(`[ERROR] ${error.message}`);
        await challenge.save();
      }
    }

    res.status(500).json({
      error: 'Deployment failed',
      details: error.message
    });
  }
}

async function stopChallenge(req, res) {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (challenge.deploymentStatus !== 'active' || !challenge.containerId) {
      return res.status(400).json({ error: 'Challenge is not currently deployed' });
    }

    await stopContainer(challenge.containerId);

    challenge.deploymentStatus = 'not_deployed';
    challenge.containerId = null;
    challenge.logs.push(`[${new Date().toISOString()}] Container stopped`);
    await challenge.save();

    res.json({
      success: true,
      message: 'Challenge stopped successfully'
    });
  } catch (error) {
    handleControllerError(res, error);
  }
}

async function getChallengeLogs(req, res) {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if(!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    res.json({ logs: challenge.logs });
  } catch (error) {
    handleControllerError(res, error);
  }
}

async function getContainerStatsController(req, res) {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge || !challenge.containerId) {
      return res.status(404).json({ error: 'No active container found' });
    }

    const stats = await getContainerStats(challenge.containerId);
    res.json(stats);
  } catch (error) {
    handleControllerError(res, error);
  }
}

// Export all controller functions at once
module.exports = {
  createChallenge,
  getChallenges,
  updateChallenge,
  searchChallenges,
  deleteChallenge,
  deployChallenge,
  stopChallenge,
  getChallengeLogs,
  getChallengeById,
  getContainerStats
};