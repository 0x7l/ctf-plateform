const DbAdmin = require('../models/dbAdmin.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Find an available database instance for a specific database type
 * @param {string} databaseType - Type of database needed
 * @returns {Promise<object|null>} - Returns a database instance or null if none available
 */
const findAvailableDbInstance = async (databaseType) => {
  try {
    const dbInstance = await DbAdmin.findOne({
      databaseType,
      isActive: true,
      $expr: { $lt: ['$currentConnections', '$maxConnections'] }
    });
    
    return dbInstance;
  } catch (error) {
    console.error('Error finding available database instance:', error);
    return null;
  }
};

/**
 * Create a database user for a challenge
 * @param {string} dbInstanceId - ID of the database instance
 * @param {string} challengeId - ID of the challenge
 * @param {string} accessLevel - Access level for the user
 * @returns {Promise<object|null>} - Returns user credentials or null on error
 */
const createDbUserForChallenge = async (dbInstanceId, challengeId, accessLevel = 'readwrite') => {
  try {
    const dbInstance = await DbAdmin.findById(dbInstanceId);
    
    if (!dbInstance) {
      throw new Error('Database instance not found');
    }
    
    // Generate a unique username and password
    const username = `user_${uuidv4().substring(0, 8)}`;
    const password = `pass_${uuidv4().substring(0, 12)}`;
    const databaseName = `db_${uuidv4().substring(0, 8)}`;
    
    // Create a new user entry
    const newUser = {
      username,
      password,
      databaseName,
      accessLevel,
      createdFor: challengeId
    };
    
    // Add the user to the database instance
    dbInstance.users.push(newUser);
    
    // Add the challenge to deployedChallenges if not already there
    if (!dbInstance.deployedChallenges.includes(challengeId)) {
      dbInstance.deployedChallenges.push(challengeId);
    }
    
    // Increment currentConnections
    dbInstance.currentConnections += 1;
    
    await dbInstance.save();
    
    return newUser;
  } catch (error) {
    console.error('Error creating database user:', error);
    return null;
  }
};

/**
 * Remove a database user for a challenge
 * @param {string} challengeId - ID of the challenge
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
 */
const removeDbUserForChallenge = async (challengeId) => {
  try {
    // Find all database instances that have a user for this challenge
    const dbInstances = await DbAdmin.find({
      'users.createdFor': challengeId
    });
    
    for (const dbInstance of dbInstances) {
      // Filter out the users for this challenge
      const initialUserCount = dbInstance.users.length;
      dbInstance.users = dbInstance.users.filter(user => user.createdFor.toString() !== challengeId.toString());
      const removedUsers = initialUserCount - dbInstance.users.length;
      
      // Update currentConnections
      dbInstance.currentConnections -= removedUsers;
      
      // Remove the challenge from deployedChallenges
      dbInstance.deployedChallenges = dbInstance.deployedChallenges.filter(
        id => id.toString() !== challengeId.toString()
      );
      
      await dbInstance.save();
    }
    
    return true;
  } catch (error) {
    console.error('Error removing database user:', error);
    return false;
  }
};

/**
 * Get database configuration for a challenge
 * @param {string} challengeId - ID of the challenge
 * @returns {Promise<object|null>} - Returns database configuration or null
 */
const getDbConfigForChallenge = async (challengeId) => {
  try {
    const dbInstance = await DbAdmin.findOne({
      'users.createdFor': challengeId
    });
    
    if (!dbInstance) {
      return null;
    }
    
    const userConfig = dbInstance.users.find(
      user => user.createdFor.toString() === challengeId.toString()
    );
    
    if (!userConfig) {
      return null;
    }
    
    return {
      connectionString: `${dbInstance.databaseType}://${userConfig.username}:${userConfig.password}@${dbInstance.host}:${dbInstance.port}/${userConfig.databaseName}`,
      host: dbInstance.host,
      port: dbInstance.port,
      username: userConfig.username,
      password: userConfig.password,
      databaseName: userConfig.databaseName,
      accessLevel: userConfig.accessLevel,
      databaseType: dbInstance.databaseType
    };
  } catch (error) {
    console.error('Error getting database config:', error);
    return null;
  }
};

module.exports = {
  findAvailableDbInstance,
  createDbUserForChallenge,
  removeDbUserForChallenge,
  getDbConfigForChallenge
};
