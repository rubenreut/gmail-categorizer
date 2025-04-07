# Changelog

## [1.0.1] - 2025-04-07

### Fixed
1. Environment variable support
   - Added proper PORT environment variable usage in server.js
   - Created environment validation system
   - Added .env.example files for frontend and backend

2. Security improvements
   - Secured hardcoded demo token in auth middleware
   - Added JWT_SECRET validation
   - Improved error handling for MongoDB connection

3. Code quality
   - Removed redundant bodyParser (express.json is sufficient)
   - Moved supertest to devDependencies
   - Fixed Email model validation by adding required fields
   - Added proper error handling to Gmail token functionality

4. Configuration
   - Replaced hardcoded localhost:5001 URLs with environment variables
   - Reduced excessive console.log statements in production
   - Added environment mode checks for sensitive operations

5. Performance
   - Improved email fetching pagination
   - Fixed Gmail permission handling in syncService
   - Added proper error handling for sync operations

6. Documentation
   - Added validateEnv.js script and npm run validate-env command
   - Created .env.example files with detailed comments
   - Added this changelog to track project improvements

7. Frontend improvements
   - Fixed hardcoded API URLs
   - Improved error handling
   - Added API_URL environment variable