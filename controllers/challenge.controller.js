const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Challenge = require('../models/challenge.model');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const validatePort = require('../utils/validatePort');
const logger = require('../utils/logger');
const { getUsedPorts, findAvailablePorts } = require('../utils/portUtils');

// const portSchema = require('../models/portSchema.model');

const CHALLENGES_DIR = path.join(__dirname, '..', 'Challenges');
if (!fs.existsSync(CHALLENGES_DIR)) {
  fs.mkdirSync(CHALLENGES_DIR, { recursive: true, mode: 0o755 });
}

// Helper to create safe directory names
const slugify = (str) => str.toString()
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^\w\-]+/g, '')
  .replace(/\-\-+/g, '-');

// Helper functions
const DEFAULT_EXEC_TIMEOUT = 2 * 60 * 1000; // 2 minutes

async function executeCommand(command, challenge, logPrefix = '', cwd = null, timeout = DEFAULT_EXEC_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const logs = [];
    logger.debug(`[EXEC] ${command} ${cwd ? `(cwd: ${cwd})` : ''}`);

    const child = exec(command, { cwd, timeout }, (error, stdout, stderr) => {
      if (error) {
        logs.push(`[ERROR] ${logPrefix}: ${stderr || error.message}`);
        if (challenge && Array.isArray(challenge.logs)) challenge.logs.push(...logs);
        reject(new Error(stderr || error.message));
        return;
      }
      logs.push(`[SUCCESS] ${logPrefix}`);
      if (challenge && Array.isArray(challenge.logs)) challenge.logs.push(...logs);
      resolve(stdout);
    });

    child.stdout.on('data', (data) => {
      logs.push(data.toString());
    });

    child.stderr.on('data', (data) => {
      logs.push(data.toString());
    });

    // Periodically save logs
    const saveInterval = setInterval(async () => {
      if (challenge && Array.isArray(challenge.logs) && logs.length) {
        challenge.logs.push(...logs.splice(0, logs.length));
        await challenge.save();
      }
    }, 2000);

    child.on('exit', () => {
      clearInterval(saveInterval);
      if (challenge && Array.isArray(challenge.logs) && logs.length) {
        challenge.logs.push(...logs.splice(0, logs.length));
        challenge.save();
      }
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
  logger.error(error);
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

    if (req.body.deployable) {
      if (!req.body.github_url || !isValidGitHubUrl(req.body.github_url)) {
        return res.status(400).json({
          error: 'Validation failed',
          details: 'A valid GitHub URL is required for deployable challenges',
        });
      }

      // Validate ports
      try {
        req.body.port = validatePort(req.body.port || 3000, 'Port');
        req.body.internalPort = validatePort(req.body.internalPort || 8080, 'Internal Port');
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid port configuration',
          details: error.message,
        });
      }
    }

    const challenge = new Challenge(req.body);
    await challenge.save();
    res.status(201).json(challenge);
  } catch (error) {
    logger.error('Create challenge error:', error);
    res.status(500).json({
      error: 'Error creating challenge',
      details: error.message,
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

// async function getusedPorts(req, res) {
//   const dbPorts = await portSchema.find({active: true});
//   const usedPorts = dbPorts.map(p => p.port);
//   return [...new Set(dbPortNumbers)]
// }

function runDockerManually(args, challenge, label = '', cwd = null) {
  return new Promise((resolve, reject) => {
    challenge.logs.push(`[${new Date().toISOString()}] ${label} (using spawn): docker ${args.join(' ')}`);

    const docker = spawn('docker', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdoutData = '';
    let stderrData = '';

    docker.stdout.on('data', (data) => {
      const str = data.toString();
      stdoutData += str;
      challenge.logs.push(`[STDOUT] ${str}`)
    });

    docker.stderr.on('data', (data) => {
      const str = data.toString();
      stderrData += str;
      challenge.logs.push(`[STDERR] ${str}`);
    });

    docker.on('close', (code) => {
      if (code === 0) {
        challenge.logs.push(`[INFO] ${label} completed successfully`);
        resolve(stdoutData.trim());
      } else {
        challenge.logs.push(`[ERROR] ${label} failed with code ${code}`);
        reject(new Error(`Docker exited with code ${code}: ${stderrData}`));
      }
    });
  });
}


async function deployChallenge(req, res) {
  let challenge = null;
  let challengeDir = null;

  try {
    logger.info('Deploy request received', { challengeId: req.params.id, userId: req.user?._id });

    // 1. Validate input ID
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      logger.warn('Invalid challenge ID', { id: req.params.id });
      return res.status(400).json({ error: 'Invalid challenge ID' });
    }

    // 2. Fetch challenge from DB
    challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      logger.warn('Challenge not found', { id: req.params.id });
      return res.status(404).json({ error: 'Challenge not found' });
    }
    if (!challenge.deployable) {
      logger.warn('Challenge not deployable', { id: req.params.id });
      return res.status(400).json({ error: 'Challenge is not marked as deployable' });
    }

    if (!challenge.github_url || !isValidGitHubUrl(challenge.github_url)) {
      logger.warn('Invalid GitHub URL', { url: challenge.github_url });
      return res.status(400).json({ 
        error: 'Valid GitHub URL is required for deployment',
        details: 'Expected format: https://github.com/owner/repo or git@github.com:owner/repo.git'
      });
    }

    // Use port from request body if provided
    if (req.body.port) {
      challenge.port = req.body.port;
    }
    if (req.body.internalPort) {
      challenge.internalPort = req.body.internalPort;
    }

    // 3. Validate ports
    try {
      challenge.port = validatePort(challenge.port, 'Port');
      challenge.internalPort = validatePort(challenge.internalPort, 'Internal Port');
    } catch (error) {
      logger.warn(`Port validation failed for challenge ${challenge._id}: ${error.message}`);
      return res.status(400).json({ error: 'Invalid port configuration', details: error.message });
    }

    // 3b. Check if port is already in use
    const usedPorts = await getUsedPorts();
    if (usedPorts.has(challenge.port)) {
      logger.warn('Requested port is already in use', { port: challenge.port });
      const availablePorts = await findAvailablePorts(1024, 65534, Array.from(usedPorts));

      // Auto-assign if requested
      if (req.query.autoPort === 'true' && availablePorts.length > 0) {
        challenge.port = availablePorts[0];
        logger.info('Auto-assigned available port', { port: challenge.port });
        // Continue with deployment...
      } else {
        return res.status(409).json({
          error: `Port ${challenge.port} is already in use.`,
          availablePorts,
          message: 'Please pick an available port from the list and retry deployment.'
        });
      }
    }

    // 4. Set deployment status & log
    challenge.deploymentStatus = 'building';
    challenge.logs = challenge.logs || [];
    challenge.logs.push(`[${new Date().toISOString()}] Deployment started...`);
    await challenge.save();
    logger.info('Deployment started', { challengeId: challenge._id });

    // 5. Setup deployment directory
    const challengeDirName = `challenge-${challenge._id}-${slugify(challenge.title)}`;
    challengeDir = path.join(CHALLENGES_DIR, challengeDirName);
    const force = req.query?.force === 'true' || req.body?.force === true;
    const isAdmin = req.user?.role === 'admin';

    // 6. Handle existing directory
    if (fs.existsSync(challengeDir)) {
      if (isAdmin && force) {
        logger.info('Admin confirmed force redeploy, removing existing directory', { challengeId: challenge._id, dir: challengeDir });
        challenge.logs.push(`[${new Date().toISOString()}] Admin confirmed force redeploy. Removing existing directory.`);
        fs.rmSync(challengeDir, { recursive: true, force: true });
      } else if (isAdmin && !force) {
        logger.warn('Directory exists, admin confirmation required for redeploy', { challengeId: challenge._id, dir: challengeDir });
        challenge.logs.push(`[${new Date().toISOString()}] Directory exists. Admin confirmation required for redeploy.`);
        await challenge.save();
        return res.status(409).json({
          error: 'Challenge directory already exists.',
          details: 'Use ?force=true to confirm overwriting the existing repo.'
        });
      } else {
        logger.warn('Non-admin attempted redeploy but directory exists', { challengeId: challenge._id, userId: req.user?._id });
        challenge.logs.push(`[${new Date().toISOString()}] Non-admin attempted redeploy but directory exists.`);
        await challenge.save();
        return res.status(409).json({
          error: 'Challenge directory already exists.',
          details: 'Only admin can force redeploy using ?force=true.'
        });
      }
    }

    // 7. Clone GitHub repo
    const authUrl = challenge.github_url.includes('http')
      ? challenge.github_url.replace('https://', `https://${process.env.GITHUB_USERNAME}:${process.env.GITHUB_TOKEN}@`)
      : `https://${process.env.GITHUB_USERNAME}:${process.env.GITHUB_TOKEN}@github.com/${challenge.github_url.replace('git@github.com:', '').replace('.git', '')}.git`;

    logger.info('Cloning repository', { repo: challenge.github_url, challengeId: challenge._id });
    await executeCommand(
      `git clone ${authUrl} ${challengeDir} && cd ${challengeDir} && git reset --hard HEAD`,
      challenge,
      'Cloning repository'
    );
    challenge.logs.push(`[INFO] Cloned repository to ${challengeDir}`);

    // 8. Build Docker image (Dockerfile only)
    const imageName = `ctf-${challenge._id}`.toLowerCase();
    logger.info('Building Docker image', { image: imageName, challengeId: challenge._id });
    await runDockerManually(
      ['build', '-t', imageName, '.'],
      challenge,
      'Building Docker image',
      challengeDir
    );

    // 9. Run Docker container
    const containerName = `ctf-${challenge._id}`.toLowerCase();
    const portMapping = `${challenge.port}:${challenge.internalPort}`;
    logger.info('Running Docker container', { container: containerName, portMapping, challengeId: challenge._id });
    
    // New code to remove existing container if present
    logger.info('Checking for existing container', { container: containerName });
    await removeContainerIfExists(containerName);
    logger.info('Existing container removed if present', { container: containerName });

    const containerId = await runDockerManually(
      ['run', '-d', '-p', portMapping, '--name', containerName, '--restart', 'unless-stopped', imageName],
      challenge,
      'Running Docker container',
      challengeDir
    );

    // 10. Finalize deployment
    challenge.containerId = containerId.trim();
    challenge.deploymentStatus = 'active';
    challenge.deployedAt = new Date();
    challenge.storagePath = challengeDir;
    await challenge.save();

    logger.info('Deployment successful', { challengeId: challenge._id, containerId: challenge.containerId });

    return res.json({
      success: true,
      method: 'dockerfile',
      port: challenge.port,
      containerId: challenge.containerId,
      logs: challenge.logs
    });

  } catch (error) {
    // Defensive: Check for port conflict in Docker error
    if (
      error.message &&
      error.message.includes('address already in use')
    ) {
      logger.warn('Docker port conflict detected during container run', { port: challenge.port });
      const usedPorts = await getUsedPorts();
      const availablePorts = await findAvailablePorts(1024, 65534, Array.from(usedPorts));
      return res.status(409).json({
        error: `Port ${challenge.port} is already in use (Docker).`,
        availablePorts,
        message: 'Please pick an available port from the list and retry deployment.'
      });
    }
    // Otherwise, handle as normal
    throw error;
  }
}

async function stopChallenge(req, res) {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      logger.warn(`Stop challenge: Challenge with ID ${req.params.id} not found`);
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (challenge.deploymentStatus !== 'active' || !challenge.containerId) {
      logger.warn(`Stop challenge: Challenge with ID ${req.params.id} is not currently deployed`);
      return res.status(400).json({ error: 'Challenge is not currently deployed' });
    }

    logger.info(`Stopping challenge with ID ${challenge._id} and container ID ${challenge.containerId}`);
    await stopContainer(challenge.containerId);

    challenge.deploymentStatus = 'not_deployed';
    challenge.containerId = null;
    challenge.logs.push(`[${new Date().toISOString()}] Container stopped`);
    await challenge.save();

    logger.info(`Challenge with ID ${challenge._id} stopped successfully`);

    res.json({
      success: true,
      message: 'Challenge stopped successfully'
    });
  } catch (error) {
    logger.error(`Error stopping challenge with ID ${req.params.id}:`, error);
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

async function removeContainerIfExists(containerName) {
  return new Promise((resolve, reject) => {
    exec(`docker ps -a --filter "name=${containerName}" --format "{{.ID}}"`, (error, stdout, stderr) => {
      if (error) return reject(error);
      const containerIds = stdout.split('\n').map(id => id.trim()).filter(Boolean);
      if (containerIds.length > 0) {
        // Stop and remove all matching containers
        exec(`docker stop ${containerIds.join(' ')} && docker rm ${containerIds.join(' ')}`, (err, out, errOut) => {
          if (err) return reject(err);
          resolve(true);
        });
      } else {
        resolve(false);
      }
    });
  });
}

// Export all controller functions at once
module.exports = {
  createChallenge,
  getChallenges,
  updateChallenge,
  searchChallenges,
  deployChallenge,
  stopChallenge,
  deleteChallenge,
  getChallengeLogs,
  getChallengeById,
  getContainerStatsController
};