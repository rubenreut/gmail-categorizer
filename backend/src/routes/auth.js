const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const categoryService = require('../services/categoryService');
const gmailAuth = require('../services/gmail/auth');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }
    
    // Create new user
    user = new User({
      email,
      password,
      firstName,
      lastName
    });
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    // Save user to database
    await user.save();
    
    // Create default system categories for the user
    try {
      await categoryService.createSystemCategories(user.id);
    } catch (error) {
      console.error('Error creating system categories:', error);
      // Continue with registration even if category creation fails
    }
    
    // Create and return JWT
    const payload = {
      id: user.id
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.status(201).json({
      success: true,
      token,
      data: {
        _id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if it's a demo login
    if (email === 'demo@example.com' && password === 'password123') {
      return res.json({
        success: true,
        token: 'demo-token-123456',
        data: {
          _id: 'user123',
          email: 'demo@example.com',
          firstName: 'Demo',
          lastName: 'User'
        }
      });
    }
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Create and return JWT
    const payload = {
      id: user.id
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    res.json({
      success: true,
      token,
      data: {
        _id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/auth/google
 * @desc    Get Google authentication URL for login
 * @access  Public
 */
router.get('/google', (req, res) => {
  try {
    // Check if required env variables are set
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Missing required OAuth environment variables');
      
      return res.status(500).json({ 
        success: false, 
        error: 'OAuth configuration is incomplete. Please check server environment variables.'
      });
    }
    
    // Use environment variable with fallback for the redirect URI
    const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI || `${process.env.API_URL || 'http://localhost:5001'}/api/auth/google/callback`;
    console.log('Using redirect URI for auth:', redirectUri);
    
    // Generate auth URL with explicit redirect URI for auth flow
    const { authUrl, state } = gmailAuth.getAuthUrl(redirectUri);
    
    // Store the state in a cookie for validation when Google redirects back
    res.cookie('googleAuthState', state, { 
      httpOnly: true, 
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    console.log('Generated auth URL for login with redirect URI:', 
      process.env.GOOGLE_AUTH_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI);
    
    res.json({
      success: true,
      data: { authUrl }
    });
  } catch (error) {
    console.error('Google auth URL error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate auth URL' });
  }
});

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google OAuth callback for login
 * @access  Public (called by Google)
 */
router.get('/google/callback', async (req, res) => {
  console.log('=== Google Auth Callback Received ===');
  console.log('Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
  console.log('Environment variables:', {
    CLIENT_ID_LENGTH: process.env.GOOGLE_CLIENT_ID?.length || 0,
    CLIENT_SECRET_LENGTH: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI
  });
  
  try {
    const { code, state, error, error_description } = req.query;
    
    console.log('Google callback received:', { 
      hasCode: !!code, 
      hasState: !!state,
      error: error || 'none',
      errorDescription: error_description || 'none'
    });
    
    if (error) {
      console.error(`Google returned an error: ${error} - ${error_description}`);
      return res.send(`
        <html>
          <head><title>Authentication Error</title></head>
          <body>
            <h1>Authentication Error</h1>
            <p>Error: ${error}</p>
            <p>Description: ${error_description || 'No description provided'}</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">Back to Login</a>
          </body>
        </html>
      `);
    }
    
    if (!code) {
      console.error('No code received from Google');
      return res.status(400).json({ success: false, error: 'Authorization code is missing' });
    }
    
    // Exchange the code for tokens using the environment-configured auth redirect URI
    console.log('Exchanging code for tokens with auth redirect URI...');
    const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI || `${process.env.API_URL || 'http://localhost:5001'}/api/auth/google/callback`;
    console.log('Using redirect URI:', redirectUri);
    
    const tokens = await gmailAuth.getTokensFromCode(code, redirectUri);
    console.log('Tokens received:', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token });
    
    // Get user info from the Google API
    console.log('Getting user info from Google...');
    const userInfo = await gmailAuth.getUserInfoFromTokens(tokens, redirectUri);
    console.log('User info received:', userInfo ? { email: userInfo.email, name: userInfo.name } : 'null');
    
    if (!userInfo || !userInfo.email) {
      console.error('Failed to get user info from Google');
      return res.status(400).json({ success: false, error: 'Failed to get user info from Google' });
    }
    
    try {
      // Check if user already exists in MongoDB by email
      let user = await User.findOne({ email: userInfo.email });
      
      if (!user) {
        // Create a new user with the Google info
        user = new User({
          email: userInfo.email,
          // Generate a random password since we won't use it
          password: await bcrypt.hash(Math.random().toString(36).substring(2), 10),
          firstName: userInfo.given_name || 'Google',
          lastName: userInfo.family_name || 'User',
          googleTokens: tokens
        });
        
        await user.save();
        console.log('Created new user from Google login:', user._id);
        
        // Create default system categories for the user
        try {
          await categoryService.createSystemCategories(user._id);
        } catch (catError) {
          console.error('Error creating categories for new Google user:', catError);
        }
      } else {
        // Update existing user with latest Google tokens
        user.googleTokens = tokens;
        if (!user.firstName && userInfo.given_name) user.firstName = userInfo.given_name;
        if (!user.lastName && userInfo.family_name) user.lastName = userInfo.family_name;
        await user.save();
        console.log('Updated existing user with Google tokens:', user._id);
      }
      
      // Create and return JWT with the MongoDB user ID
      const payload = {
        id: user._id
      };
      
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
      
      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (dbError) {
      console.error('Error creating user or token:', dbError);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error: ' + dbError.message 
      });
    }
  } catch (error) {
    console.error('Google callback error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    const errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    };
    
    console.error('Full error details JSON:', JSON.stringify(errorDetails, null, 2));
    
    // For debugging, return a more detailed error page with stack trace
    return res.send(`
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
            h1 { color: #e74c3c; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow: auto; }
            .back-button { display: inline-block; margin-top: 20px; padding: 10px 15px; 
                          background: #3498db; color: white; text-decoration: none; border-radius: 4px; }
            .error-section { margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>Authentication Error</h1>
          
          <div class="error-section">
            <h2>Error Message</h2>
            <p>${error.message}</p>
          </div>
          
          <div class="error-section">
            <h2>Error Details</h2>
            <pre>${JSON.stringify(errorDetails, null, 2)}</pre>
          </div>
          
          <div class="error-section">
            <h2>Environment</h2>
            <pre>
Redirect URI: ${process.env.GOOGLE_AUTH_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI}
Client ID exists: ${!!process.env.GOOGLE_CLIENT_ID}
Client Secret exists: ${!!process.env.GOOGLE_CLIENT_SECRET}
            </pre>
          </div>
          
          <a class="back-button" href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">Back to Login</a>
          
          <script>
            // Log error details to console
            console.error('Authentication Error:', ${JSON.stringify(JSON.stringify(errorDetails))});
          </script>
        </body>
      </html>
    `);
  }
});

module.exports = router;