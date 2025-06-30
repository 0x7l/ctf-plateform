// const Challenge = require('../models/challenge.model');
// const CtfRunningChallenge = require('../models/ctfRunningChallenge.model');
// const dbService = require('./database.service');

// /**
//  * Launch a new running challenge with database setup if needed
//  * @param {object} challengeData - Data for the running challenge
//  * @returns {Promise<object>} - Created running challenge
//  */
// const launchChallenge = async (challengeData) => {
//   try {
//     // Retrieve the base challenge to check if database is required
//     const baseChallenge = await Challenge.findById(challengeData.challengeId);
//     if (!baseChallenge) {
//       throw new Error('Base challenge not found');
//     }

//     // Create the running challenge
//     const runningChallenge = await CtfRunningChallenge.create(challengeData);

//     // Set up database if required
//     if (baseChallenge.databaseRequired && baseChallenge.databaseType !== 'none') {
//       // Find an available database instance
//       const dbInstance = await dbService.findAvailableDbInstance(baseChallenge.databaseType);
      
//       if (dbInstance) {
//         // Create a database user for this challenge
//         const dbUser = await dbService.createDbUserForChallenge(
//           dbInstance._id,
//           runningChallenge._id,
//           'readwrite'
//         );
        
//         if (dbUser) {
//           // Update the running challenge with database configuration
//           runningChallenge.databaseConfig = {
//             connectionString: `${baseChallenge.databaseType}://${dbUser.username}:${dbUser.password}@${dbInstance.host}:${dbInstance.port}/${dbUser.databaseName}`,
//             host: dbInstance.host,
//             port: dbInstance.port,
//             username: dbUser.username,
//             password: dbUser.password,
//             databaseName: dbUser.databaseName,
//             accessLevel: dbUser.accessLevel
//           };
          
//           await runningChallenge.save();
//         }
//       }
//     }
    
//     // Populate the challengeId reference
//     await runningChallenge.populate('challengeId');
    
//     return runningChallenge;
//   } catch (error) {
//     console.error('Error launching challenge:', error);
//     throw error;
//   }
// };

// /**
//  * Terminate a running challenge and clean up resources
//  * @param {string} runningChallengeId - ID of the running challenge
//  * @returns {Promise<boolean>} - Returns true if successful
//  */
// const terminateChallenge = async (runningChallengeId) => {
//   try {
//     const runningChallenge = await CtfRunningChallenge.findById(runningChallengeId);
    
//     if (!runningChallenge) {
//       throw new Error('Running challenge not found');
//     }
    
//     // Clean up database resources
//     await dbService.removeDbUserForChallenge(runningChallengeId);
    
//     // Delete the running challenge
//     await CtfRunningChallenge.findByIdAndDelete(runningChallengeId);
    
//     return true;
//   } catch (error) {
//     console.error('Error terminating challenge:', error);
//     throw error;
//   }
// };

// /**
//  * Search for challenges by criteria
//  * @param {object} criteria - Search criteria
//  * @returns {Promise<Array>} - Array of matching challenges
//  */
// const searchChallenges = async (criteria) => {
//   try {
//     const query = {};
    
//     // Add search by title (case-insensitive)
//     if (criteria.title) {
//       query.title = { $regex: criteria.title, $options: 'i' };
//     }
    
//     // Add search by category
//     if (criteria.category) {
//       query.category = criteria.category;
//     }
    
//     // Add search by difficulty
//     if (criteria.difficulty) {
//       query.difficulty = criteria.difficulty;
//     }
    
//     // Add search by tags
//     if (criteria.tags && criteria.tags.length > 0) {
//       query.tags = { $in: criteria.tags };
//     }
    
//     // Add search by database required
//     if (criteria.databaseRequired !== undefined) {
//       query.databaseRequired = criteria.databaseRequired;
//     }
    
//     // Add search by database type
//     if (criteria.databaseType) {
//       query.databaseType = criteria.databaseType;
//     }
    
//     // Execute the query
//     const challenges = await Challenge.find(query);
    
//     return challenges;
//   } catch (error) {
//     console.error('Error searching challenges:', error);
//     throw error;
//   }
// };

// module.exports = {
//   launchChallenge,
//   terminateChallenge,
//   searchChallenges
// };
