// // const Challenge = require('../models/challenge.model');
// // const CtfRunningChallenge = require('../models/ctfRunningChallenge.model');
// // const deploymentService = require('../services/deployment.service');
// const mongoose = require('mongoose')
// const dotenv = require('dotenv').config();
// const fs = require('fs');
// const path = require('path');
// const {exec, spawn} = require('child_process');
// const { v4: uuidv4 } = require('uuid');
// const Challenge = require('../models/challenge.model');
// const TEMP_DIR = path.join('../', 'ctf-deployments');

// const TEMP_DIR = path.join('../Challenge')


// async function deployChallenge(req, res) {
//   try {
//     // Validate input
//     if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
//       return res.status(400).json({ error: 'Invalid challenge ID' });
//     }

//     const challenge = await Challenge.findById(req.params.id);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }

//     // Validate deployment requirements
//     if (!challenge.deployable) {
//       return res.status(400).json({ error: 'Challenge is not marked as deployable' });
//     }

//     if (!challenge.github_url || !isValidGitHubUrl(challenge.github_url)) {
//       return res.status(400).json({ 
//         error: 'Valid GitHub URL is required for deployment',
//         details: 'URL must be in format: https://github.com/owner/repo'
//       });
//     }

//     // Validate ports
//     if (!challenge.port || !challenge.internalPort ||
//         isNaN(challenge.port) || isNaN(challenge.internalPort)) {
//       return res.status(400).json({ 
//         error: 'Invalid port configuration',
//         details: 'Both port and internalPort must be valid numbers'
//       });
//     }

//     // Initialize deployment
//     challenge.deploymentStatus = 'building';
//     challenge.logs = challenge.logs || []; // Ensure logs array exists
//     challenge.logs.push(`[${new Date().toISOString()}] Starting deployment...`);
//     await challenge.save();

//     // Prepare deployment directory
//     const deploymentDir = path.join(TEMP_DIR, `challenge-${challenge._id}-${uuidv4()}`);
    
//     try {
//       // Clone repository with authentication
//       const gitUrl = new URL(challenge.github_url);
//       gitUrl.username = process.env.GITHUB_USERNAME || '';
//       gitUrl.password = process.env.GITHUB_TOKEN || '';
//       const authGitUrl = gitUrl.toString();

//       await executeCommand(
//         `git clone ${authGitUrl} ${deploymentDir}`,
//         challenge,
//         'Cloning repository'
//       );

//       // Build Docker image
//       const imageName = `ctf-${challenge._id}`.toLowerCase(); // Docker requires lowercase
//       await executeCommand(
//         `docker build -t ${imageName} ${deploymentDir}`,
//         challenge,
//         'Building Docker image'
//       );

//       // Run container
//       const portMapping = `${challenge.port}:${challenge.internalPort}`;
//       const containerName = `ctf-container-${challenge._id}`.toLowerCase();
//       const containerId = await executeCommand(
//         `docker run -d -p ${portMapping} --name ${containerName} ${imageName}`,
//         challenge,
//         'Starting container'
//       );

//       // Update challenge status
//       challenge.deploymentStatus = 'active';
//       challenge.containerId = containerId.trim();
//       challenge.deployedAt = new Date();
//       await challenge.save();

//       // Clean up deployment directory
//       try {
//         fs.rmSync(deploymentDir, { recursive: true, force: true });
//       } catch (cleanupError) {
//         console.warn('Could not clean up deployment directory:', cleanupError);
//       }

//       return res.json({
//         success: true,
//         port: challenge.port,
//         containerId: challenge.containerId,
//         logs: challenge.logs
//       });

//     } catch (deploymentError) {
//       // Clean up on failure
//       try {
//         fs.rmSync(deploymentDir, { recursive: true, force: true });
//       } catch (cleanupError) {
//         console.warn('Cleanup failed after deployment error:', cleanupError);
//       }
//       throw deploymentError;
//     }

//   } catch (error) {
//     console.error('Deployment error:', error);
    
//     // Update challenge status if available
//     if (req.params.id) {
//       try {
//         const challenge = await Challenge.findById(req.params.id);
//         if (challenge) {
//           challenge.deploymentStatus = 'failed';
//           challenge.logs = challenge.logs || [];
//           challenge.logs.push(`[ERROR] ${error.message}`);
//           await challenge.save();
//         }
//       } catch (saveError) {
//         console.error('Failed to update challenge status:', saveError);
//       }
//     }

//     return res.status(500).json({
//       error: 'Deployment failed',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// }

// async function stopChallenge(req, res) {
//   try {
//     const challenge = await Challenge.findById(req.params.id);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }

//     if (challenge.deploymentStatus !== 'active' || !challenge.containerId) {
//       return res.status(400).json({ error: 'Challenge is not currently deployed' });
//     }

//     await stopContainer(challenge.containerId);

//     challenge.deploymentStatus = 'not_deployed';
//     challenge.containerId = null;
//     challenge.logs.push(`[${new Date().toISOString()}] Container stopped`);
//     await challenge.save();

//     res.json({
//       success: true,
//       message: 'Challenge stopped successfully'
//     });
//   } catch (error) {
//     handleControllerError(res, error);
//   }
// }

// module.exports = {
//   deployChallenge,
//   stopChallenge,
//   getChallengeStatus
// };