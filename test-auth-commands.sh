# Authentication Test Commands

# 1. Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'

# 2. Login with the new user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "testuser", "password": "password123"}'

# 3. Get current user profile (replace TOKEN with the token from the login response)
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# 4. Update user profile (replace TOKEN with your actual token)
curl -X PUT http://localhost:3000/api/auth/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"username": "updateduser", "email": "updated@example.com"}'

# 5. Register an admin user (for testing purposes)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "email": "admin@example.com", "password": "admin123"}'

# You'll need to update the user role to admin in the database manually:
# db.users.updateOne({username: "admin"}, {$set: {role: "admin"}})

# 6. Get user challenges (replace TOKEN with your actual token)
curl -X GET http://localhost:3000/api/solves/user \
  -H "Authorization: Bearer TOKEN"

# 7. Create a solve (replace TOKEN with your actual token)
curl -X POST http://localhost:3000/api/solves \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"challengeId": "CHALLENGE_ID"}'

# 8. Admin: Get all solves (replace ADMIN_TOKEN with admin token)
curl -X GET http://localhost:3000/api/solves \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 9. Admin: Create a new challenge (replace ADMIN_TOKEN with admin token)
curl -X POST http://localhost:3000/api/challenges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"title": "New Challenge", "description": "Description", "category": "web", "difficulty": "medium", "databaseRequired": true, "databaseType": "mongodb"}'

# 10. Admin: Create a running challenge (replace ADMIN_TOKEN with admin token)
curl -X POST http://localhost:3000/api/ctf-running \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"challengeId": "CHALLENGE_ID", "flag": "flag{test_flag}", "points": 100}'
