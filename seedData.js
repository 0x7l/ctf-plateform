/**
 * Script to seed the database with test data for a CTF platform
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');

// Load models
const User = require('./models/user.model');
const Challenge = require('./models/challenge.model');
const CtfRunningChallenge = require('./models/ctfRunningChallenge.model');
const Solve = require('./models/solve.model');

// Load environment variables
dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected...');
    seed();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  });

// Seed function
async function seed() {
  try {
    console.log('Cleaning existing data...');
    await Promise.all([
      User.deleteMany({}),
      Challenge.deleteMany({}),
      CtfRunningChallenge.deleteMany({}),
      Solve.deleteMany({})
    ]);

    console.log('Creating admin user...');
    // Create admin user
    const admin = new User({
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      active: true,
      score: 0
    });

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.pbkdf2Sync(
      'admin123', // Default password, change in production!
      salt,
      1000,
      64,
      'sha512'
    ).toString('hex');

    admin.salt = salt;
    admin.passwordHash = passwordHash;
    admin.generateApiToken();
    await admin.save();

    console.log('Creating regular users...');
    // Create regular users
    const users = [];
    const usernames = ['hacker1', 'hacker2', 'challenger'];
    
    for (const username of usernames) {
      const user = new User({
        username,
        email: `${username}@example.com`,
        role: 'user',
        active: true,
        score: 0
      });

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = crypto.pbkdf2Sync(
        'password123', // Default password, change in production!
        salt,
        1000,
        64,
        'sha512'
      ).toString('hex');

      user.salt = salt;
      user.passwordHash = passwordHash;
      user.generateApiToken();
      await user.save();
      users.push(user);
    }

    console.log('Creating challenges...');
    // Create sample challenges
    const challenges = [
      {
        title: 'SQL Injection 101',
        description: 'A basic SQL injection challenge to learn the fundamentals',
        category: 'web',
        difficulty: 'easy',
        tags: ['sql', 'injection', 'web'],
        hints: ['Have you tried using single quotes?'],
        github_url: '',
        deployable: true,
        databaseRequired: true,
        databaseType: 'mysql'
      },
      {
        title: 'Broken Authentication',
        description: 'Exploit a broken authentication mechanism to gain admin access',
        category: 'web',
        difficulty: 'medium',
        tags: ['auth', 'web', 'session'],
        hints: ['Check for client-side validation'],
        github_url: '',
        deployable: true,
        databaseRequired: false,
        databaseType: 'none'
      },
      {
        title: 'Buffer Overflow Basic',
        description: 'A classic buffer overflow challenge to learn memory corruption',
        category: 'pwn',
        difficulty: 'hard',
        tags: ['buffer-overflow', 'pwn', 'memory'],
        hints: ['Check the stack layout'],
        github_url: '',
        deployable: true,
        databaseRequired: false,
        databaseType: 'none'
      },
      {
        title: 'Cryptography Challenge',
        description: 'Break weak cryptographic implementation',
        category: 'crypto',
        difficulty: 'medium',
        tags: ['crypto', 'math', 'encryption'],
        hints: ['The key is weak'],
        github_url: '',
        deployable: false,
        databaseRequired: false,
        databaseType: 'none'
      },
      {
        title: 'MongoDB Injection',
        description: 'Exploit NoSQL injection to bypass authentication',
        category: 'web',
        difficulty: 'easy',
        tags: ['nosql', 'injection', 'web', 'mongodb'],
        hints: ['Try JSON injection in the parameters'],
        github_url: '',
        deployable: true,
        databaseRequired: true,
        databaseType: 'mongodb'
      }
    ];

    const createdChallenges = await Challenge.insertMany(challenges);

    console.log('Creating running challenges...');
    // Create running challenges
    const ctfRunningChallenges = [];
    
    for (let i = 0; i < createdChallenges.length; i++) {
      const points = (i % 3 + 1) * 100; // 100, 200, 300 points
      const challenge = createdChallenges[i];
      
      const runningChallenge = new CtfRunningChallenge({
        challengeId: challenge._id,
        flag: `flag{test_flag_${i + 1}}`,
        points,
        isActive: true,
        deployed: i < 3, // First 3 are deployed
        deploymentURL: i < 3 ? `https://challenge-${i + 1}.ctf-platform.com` : '',
        dockerImage: i < 3 ? `ctf/challenge-${i + 1}:latest` : '',
        dockerContainer: i < 3 ? `challenge-${i + 1}-container` : '',
        dockerPort: i < 3 ? 8080 + i : null,
        databaseConfig: challenge.databaseRequired ? {
          connectionString: '',
          host: 'db-server',
          port: challenge.databaseType === 'mysql' ? 3306 : 27017,
          username: `challenge_${i + 1}_user`,
          password: `password_${i + 1}`,
          databaseName: `challenge_${i + 1}_db`,
          accessLevel: 'readwrite'
        } : {},
        hints: [
          {
            content: `Hint 1 for challenge ${i + 1}`,
            cost: 10
          },
          {
            content: `Hint 2 for challenge ${i + 1}`,
            cost: 25
          }
        ]
      });
      
      await runningChallenge.save();
      ctfRunningChallenges.push(runningChallenge);
    }

    console.log('Creating solves...');
    // Create some solves
    const solves = [];
    
    // Each user solves some challenges
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Each user solves a different number of challenges
      const numSolves = i + 1;
      let totalPoints = 0;
      
      for (let j = 0; j < numSolves && j < ctfRunningChallenges.length; j++) {
        const challenge = ctfRunningChallenges[j];
        
        const solve = new Solve({
          userId: user._id,
          challengeId: challenge._id,
          solvedAt: new Date(Date.now() - (j * 24 * 60 * 60 * 1000)) // Different days
        });
        
        await solve.save();
        solves.push(solve);
        totalPoints += challenge.points;
        
        // Add challenge to user's solved challenges
        user.solvedChallenges.push(challenge._id);
      }
      
      // Update user's score
      user.score = totalPoints;
      await user.save();
    }

    console.log('Database seeded successfully!');
    console.log(`Created ${users.length + 1} users (including admin)`);
    console.log(`Created ${challenges.length} challenges`);
    console.log(`Created ${ctfRunningChallenges.length} running challenges`);
    console.log(`Created ${solves.length} solves`);
    
    console.log('\nTest User Credentials:');
    console.log('Admin: admin@example.com / admin123');
    console.log('Users: hacker1@example.com, hacker2@example.com, challenger@example.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}
