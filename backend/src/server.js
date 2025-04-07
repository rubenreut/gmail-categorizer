const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const syncService = require('./services/syncService');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5050; // Use environment variable with fallback

// MongoDB Connection
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gmail-categorizer', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
    });
    console.log('MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.log('Continuing without MongoDB - some features will be limited');
    return false;
  }
};

// Attempt to connect and handle connection failure
connectMongoDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Gmail Categorizer API is running' });
});

// Import and use routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const filterRoutes = require('./routes/filters');
const emailRoutes = require('./routes/emails');
const searchRoutes = require('./routes/search');
const gmailRoutes = require('./routes/gmail');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/filters', filterRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/gmail', gmailRoutes);

// Validate required environment variables
function validateEnvironment() {
  const requiredVars = ['JWT_SECRET', 'MONGODB_URI', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please check your .env file');
    return false;
  }
  return true;
}

// Start the server if this file is run directly
if (require.main === module) {
  // Check environment variables
  if (!validateEnvironment() && process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Start email sync service
    syncService.startEmailSync();
  });
}

// Export for testing
module.exports = app;