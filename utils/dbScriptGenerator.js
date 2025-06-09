/**
 * Generates an SQL initialization script for MySQL/PostgreSQL
 * @param {string} databaseType - The type of database ('mysql' or 'postgresql')
 * @param {string} databaseName - The name of the database to initialize
 * @param {string} username - The username to create and grant privileges to
 * @param {string} password - The password for the user
 * @returns {string} - SQL initialization script
 */
const generateSqlInitScript = (databaseType, databaseName, username, password) => {
  let script = '';
  
  if (databaseType === 'mysql') {
    script = `
-- MySQL initialization script for CTF challenge
CREATE DATABASE IF NOT EXISTS \`${databaseName}\`;

-- Create user with appropriate privileges
CREATE USER IF NOT EXISTS '${username}'@'%' IDENTIFIED BY '${password}';
GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO '${username}'@'%';
FLUSH PRIVILEGES;

-- Switch to the new database
USE \`${databaseName}\`;

-- Create sample tables for the CTF challenge
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`username\` VARCHAR(50) NOT NULL UNIQUE,
  \`password\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(100),
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO \`users\` (\`username\`, \`password\`, \`email\`) VALUES
('admin', 'supersecretadminpass123', 'admin@example.com'),
('user1', 'userpass123', 'user1@example.com'),
('user2', 'userpass456', 'user2@example.com');

-- Create additional tables as needed
CREATE TABLE IF NOT EXISTS \`notes\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`title\` VARCHAR(100) NOT NULL,
  \`content\` TEXT,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
);

-- Insert sample notes
INSERT INTO \`notes\` (\`user_id\`, \`title\`, \`content\`) VALUES
(1, 'Secret Flag', 'The flag is hidden somewhere in the database!'),
(1, 'Admin Notes', 'Remember to change all default passwords.'),
(2, 'My First Note', 'This is a test note for user1.');
`;
  } else if (databaseType === 'postgresql') {
    script = `
-- PostgreSQL initialization script for CTF challenge
CREATE DATABASE ${databaseName};

-- Connect to the new database
\\c ${databaseName}

-- Create user with appropriate privileges
CREATE USER ${username} WITH PASSWORD '${password}';
GRANT ALL PRIVILEGES ON DATABASE ${databaseName} TO ${username};

-- Create sample tables for the CTF challenge
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (username, password, email) VALUES
('admin', 'supersecretadminpass123', 'admin@example.com'),
('user1', 'userpass123', 'user1@example.com'),
('user2', 'userpass456', 'user2@example.com');

-- Create additional tables as needed
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert sample notes
INSERT INTO notes (user_id, title, content) VALUES
(1, 'Secret Flag', 'The flag is hidden somewhere in the database!'),
(1, 'Admin Notes', 'Remember to change all default passwords.'),
(2, 'My First Note', 'This is a test note for user1.');

-- Grant privileges to the user for all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${username};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${username};
`;
  }
  
  return script;
};

/**
 * Generates a MongoDB initialization script
 * @param {string} databaseName - The name of the database to initialize
 * @param {string} username - The username to create
 * @param {string} password - The password for the user
 * @returns {string} - MongoDB initialization script
 */
const generateMongoInitScript = (databaseName, username, password) => {
  return `
// MongoDB initialization script for CTF challenge
use ${databaseName}

// Create user with appropriate roles
db.createUser({
  user: "${username}",
  pwd: "${password}",
  roles: [{ role: "readWrite", db: "${databaseName}" }]
})

// Create sample collections and insert data
db.users.insertMany([
  {
    username: "admin",
    password: "supersecretadminpass123",
    email: "admin@example.com",
    isAdmin: true,
    createdAt: new Date()
  },
  {
    username: "user1",
    password: "userpass123",
    email: "user1@example.com",
    isAdmin: false,
    createdAt: new Date()
  },
  {
    username: "user2",
    password: "userpass456",
    email: "user2@example.com",
    isAdmin: false,
    createdAt: new Date()
  }
])

// Create notes collection
db.notes.insertMany([
  {
    userId: db.users.findOne({ username: "admin" })._id,
    title: "Secret Flag",
    content: "The flag is hidden somewhere in the database!",
    createdAt: new Date()
  },
  {
    userId: db.users.findOne({ username: "admin" })._id,
    title: "Admin Notes",
    content: "Remember to change all default passwords.",
    createdAt: new Date()
  },
  {
    userId: db.users.findOne({ username: "user1" })._id,
    title: "My First Note",
    content: "This is a test note for user1.",
    createdAt: new Date()
  }
])

// Create an index for better query performance
db.users.createIndex({ username: 1 }, { unique: true })
db.notes.createIndex({ userId: 1 })
`;
};

/**
 * Generate initialization script for SQLite
 * @param {string} databaseName - The name of the database file
 * @returns {string} - SQLite initialization script
 */
const generateSqliteInitScript = (databaseName) => {
  return `
-- SQLite initialization script for CTF challenge
-- No user creation needed for SQLite

-- Create sample tables for the CTF challenge
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (username, password, email) VALUES
('admin', 'supersecretadminpass123', 'admin@example.com'),
('user1', 'userpass123', 'user1@example.com'),
('user2', 'userpass456', 'user2@example.com');

-- Create additional tables as needed
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert sample notes
INSERT INTO notes (user_id, title, content) VALUES
(1, 'Secret Flag', 'The flag is hidden somewhere in the database!'),
(1, 'Admin Notes', 'Remember to change all default passwords.'),
(2, 'My First Note', 'This is a test note for user1.');

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
`;
};

/**
 * Generate Redis initialization commands
 * @param {string} password - The password for authentication
 * @returns {string} - Redis initialization commands
 */
const generateRedisInitScript = (password) => {
  return `
# Redis initialization for CTF challenge

# Configure Redis to use authentication
CONFIG SET requirepass "${password}"

# Set sample data for the CTF challenge
SET admin:password "supersecretadminpass123"
SET admin:email "admin@example.com"
SET admin:role "admin"

SET user1:password "userpass123"
SET user1:email "user1@example.com"
SET user1:role "user"

SET user2:password "userpass456"
SET user2:email "user2@example.com"
SET user2:role "user"

# Create a list for admin notes
RPUSH admin:notes "Secret Flag: The flag is hidden somewhere in the database!"
RPUSH admin:notes "Admin Notes: Remember to change all default passwords."

# Create a list for user1 notes
RPUSH user1:notes "My First Note: This is a test note for user1."

# Create a set of all users
SADD users "admin" "user1" "user2"

# Create a sorted set with user scores
ZADD scores 100 "admin" 50 "user1" 25 "user2"
`;
};

/**
 * Generate a database initialization script based on the database type
 * @param {object} dbConfig - Database configuration object
 * @returns {string} - Initialization script
 */
const generateDbInitScript = (dbConfig) => {
  const { databaseType, databaseName, username, password } = dbConfig;
  
  switch (databaseType) {
    case 'mysql':
    case 'postgresql':
      return generateSqlInitScript(databaseType, databaseName, username, password);
    case 'mongodb':
      return generateMongoInitScript(databaseName, username, password);
    case 'sqlite':
      return generateSqliteInitScript(databaseName);
    case 'redis':
      return generateRedisInitScript(password);
    default:
      return `# No initialization script available for ${databaseType}`;
  }
};

module.exports = {
  generateDbInitScript,
  generateSqlInitScript,
  generateMongoInitScript,
  generateSqliteInitScript,
  generateRedisInitScript
};
