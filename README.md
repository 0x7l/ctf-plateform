#  CTF Platform API

A RESTful API for managing a Capture The Flag (CTF) competition platform.

## Features

- **Complete Authentication System**: Secure registration and login with custom token-based authentication
- **Challenge Management**: Create, read, update, and delete challenge metadata
- **Running Challenges**: Deploy and manage running challenge instances
- **User Solve Tracking**: Track user solutions and calculate scores
- **Leaderboard**: View top users and detailed user statistics
- **Database Management**: Manage database instances for challenges that require persistent storage

## Setup & Installation

### Standard Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory (see `.env.example` for required variables)
4. Start the server:
   ```
   npm start
   ```
   or for development with auto-reload:
   ```
   npm run dev
   ```

### Docker Setup

1. Clone the repository
2. Use Docker Compose to build and run:
   ```
   npm run docker-build
   npm run docker-up
   ```
3. To stop the services:
   ```
   npm run docker-down
   ```

### Admin User Creation

Create an administrator user:
```
npm run create-admin admin@example.com YourSecurePassword
```

### Seeding Test Data

Populate the database with test data (challenges, users, solves):
```
npm run seed
```

This will create:
- Admin user: admin@example.com / admin123
- Regular users: hacker1, hacker2, challenger (all with password123)
- 5 sample challenges with running instances
- Sample solve records

### Running Tests

Execute the test suite:
```
npm test
```

Run tests in watch mode during development:
```
npm run test:watch
```

## Security Features

- **Custom Token-based Authentication**: Secure API endpoints with token validation
- **Role-based Access Control**: Admin and regular user role separation
- **Rate Limiting**: Prevent abuse with rate limiting (100 requests per minute)
- **Input Validation**: Comprehensive validation of all incoming data
- **Secure Headers**: Implemented with Helmet.js
- **CORS Protection**: Configured cross-origin resource sharing

## API Documentation

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register a new user | Public |
| POST | `/api/auth/login` | Login a user | Public |
| GET | `/api/auth/me` | Get current user profile | Private |
| PUT | `/api/auth/me` | Update current user profile | Private |
| GET | `/api/auth/users/:id` | Get user by ID | Admin |
| PUT | `/api/auth/users/:id` | Update user | Admin |

#### Authentication Request Examples

##### Register User
```json
{
  "username": "challenger",
  "email": "challenger@example.com",
  "password": "securePassword123"
}
```

##### Login User
```json
{
  "identifier": "challenger",  // Can be username or email
  "password": "securePassword123"
}
```

##### Update User Profile
```json
{
  "username": "newUsername",
  "email": "newemail@example.com",
  "password": "newPassword123"  // Optional
}
```

### Challenges

Static challenge metadata

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/challenges` | Get all challenges | Public |
| GET | `/api/challenges/:id` | Get a specific challenge | Public |
| POST | `/api/challenges` | Create a new challenge | Admin |
| PUT | `/api/challenges/:id` | Update a challenge | Admin |
| DELETE | `/api/challenges/:id` | Delete a challenge | Admin |
| POST | `/api/challenges/search` | Search challenges | Public |

#### Challenge Request Body Examples

##### Create Challenge
```json
{
  "title": "SQL Injection 101",
  "description": "Basic SQL injection challenge",
  "category": "web",
  "difficulty": "easy",
  "tags": ["sql", "injection", "web"],
  "hints": ["Have you tried using single quotes?"],
  "github_url": "https://github.com/example/sql-injection-101",
  "deployable": true,
  "databaseRequired": true,
  "databaseType": "mysql"
}
```

### CTF Running Challenges

Runtime instances of challenges

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/ctf-running` | Get all running challenges | Public |
| GET | `/api/ctf-running/:id` | Get a specific running challenge | Public |
| POST | `/api/ctf-running` | Create a new running challenge | Admin |
| PUT | `/api/ctf-running/:id` | Update a running challenge | Admin |
| DELETE | `/api/ctf-running/:id` | Delete a running challenge | Admin |

#### CTF Running Challenge Request Body Examples

##### Create Running Challenge
```json
{
  "challengeId": "60f7a9b9e6b3f32b8c1d5e7a",
  "flag": "flag{sql_1nj3ct10n_m4st3r}",
  "points": 100,
  "isActive": true,
  "deployed": true,
  "deploymentURL": "https://sql-challenge.ctf-platform.com",
  "dockerImage": "ctf/sql-challenge:latest",
  "dockerContainer": "sql-challenge-container",
  "dockerPort": 8080,
  "databaseConfig": {
    "connectionString": "",
    "host": "db-server",
    "port": 3306,
    "username": "challenge_user",
    "password": "challenge_pass",
    "databaseName": "challenge_db",
    "accessLevel": "readwrite"
  },
  "hints": [
    {
      "content": "Check the login form.",
      "cost": 10
    },
    {
      "content": "Try using ' OR '1'='1",
      "cost": 25
    }
  ]
}
```

### Solves

Records of challenge solves by users

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/solves` | Get all solves | Admin |
| GET | `/api/solves/:id` | Get a specific solve | Admin |
| GET | `/api/solves/user` | Get current user's solves | Private |
| POST | `/api/solves` | Create a new solve record | Private |
| PUT | `/api/solves/:id` | Update a solve record | Admin |
| DELETE | `/api/solves/:id` | Delete a solve record | Admin |

#### Solve Request Body Examples

##### Create Solve
```json
{
  "challengeId": "60f7b0f9e6b3f32b8c1d5e7c"
}
```

### Leaderboard

View top users and user statistics

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/leaderboard` | Get user leaderboard | Public |
| GET | `/api/leaderboard/:username` | Get detailed user stats | Public |

#### Leaderboard Query Parameters

- `page`: Page number for pagination (default: 1)
- `limit`: Results per page (default: 10)

### Database Administration

Manage database instances for challenges

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/db-admin` | Get all database instances | Admin |
| GET | `/api/db-admin/:id` | Get a specific database instance | Admin |
| POST | `/api/db-admin` | Create a new database instance | Admin |
| PUT | `/api/db-admin/:id` | Update a database instance | Admin |
| DELETE | `/api/db-admin/:id` | Delete a database instance | Admin |
| POST | `/api/db-admin/:id/users` | Create a database user for a challenge | Admin |

#### Database Admin Request Body Examples

##### Create Database Instance
```json
{
  "databaseType": "mongodb",
  "instanceName": "mongodb-ctf-main",
  "connectionString": "mongodb://localhost:27017",
  "host": "localhost",
  "port": 27017,
  "adminUsername": "rootadmin",
  "adminPassword": "securepassword",
  "isActive": true,
  "maxConnections": 50
}
```

##### Create Database User
```json
{
  "challengeId": "60f7b0f9e6b3f32b8c1d5e7c",
  "accessLevel": "readwrite"
}
```

## Error Responses

The API returns the following error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

HTTP status codes:
- 400: Bad request (validation error)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Resource not found
- 429: Too many requests
- 500: Server error

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },  // Response data
  "count": 10,      // (When returning arrays)
  "pagination": {   // (When paginated)
    "total": 50,
    "page": 1,
    "pages": 5
  }
}
```

## Authentication Flow

1. **Registration**: Create a new user account
   - POST to `/api/auth/register` with username, email, and password
   - Returns user object and authentication token

2. **Login**: Authenticate with credentials
   - POST to `/api/auth/login` with identifier (username or email) and password
   - Returns user object and authentication token

3. **Using Authentication**: Include token in requests
   - Add `Authorization: Bearer YOUR_TOKEN` header to requests
   - Token validity: 30 days

## Role-Based Access

- **User Role**: Can view challenges, submit flags, and track personal progress
- **Admin Role**: Full access to create/edit challenges, manage the platform, and view all data

## Rate Limiting

API requests are limited to 100 requests per minute per IP address.

## Project Structure

```
├── config/             # Configuration files
├── controllers/        # Request handlers
├── middleware/         # Custom middleware
├── models/             # Database models
├── routes/             # API routes
├── services/           # Business logic
├── utils/              # Helper functions
├── server.js           # Main application file
└── package.json        # Project dependencies
```

## Future Enhancements

- WebSocket support for real-time updates
- Integrated Docker management for challenge deployments
- Metrics collection and analytics dashboard
- Support for team-based competitions
