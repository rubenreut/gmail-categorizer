const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const gmailAuth = require('../services/gmail/auth');
const gmailFetcher = require('../services/gmail/fetcher');

/**
 * @route   GET /api/gmail/auth-url
 * @desc    Get Gmail authentication URL
 * @access  Private
 */
router.get('/auth-url', auth, async (req, res) => {
  try {
    console.log('Generating Gmail auth URL for user:', req.user.id);
    
    // Check if required env variables are set
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      console.error('Missing required OAuth environment variables:', {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasGoogleRedirectUri: !!process.env.GOOGLE_REDIRECT_URI
      });
      
      return res.status(500).json({ 
        success: false, 
        error: 'OAuth configuration is incomplete. Please check server environment variables.'
      });
    }
    
    console.log('OAuth environment variables loaded:', {
      GOOGLE_CLIENT_ID_LENGTH: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.length : 0,
      GOOGLE_CLIENT_SECRET_LENGTH: process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.length : 0,
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI
    });
    
    // For demo user, just return success
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        data: {
          authUrl: 'https://accounts.google.com/o/oauth2/v2/auth/demo',
          state: 'demo-state'
        }
      });
    }
    
    const { authUrl, state } = gmailAuth.getAuthUrl();
    
    console.log('Generated OAuth URL:', { state, authUrlLength: authUrl.length });
    
    // Store the state token in the user document
    console.log(`Saving state token "${state}" for user ${req.user.id}`);
    
    try {
      // Verify we can find the user first
      const user = await User.findById(req.user.id);
      if (!user) {
        console.error(`User ${req.user.id} not found in database`);
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      // Update the user document with the state token
      user.googleAuthState = state;
      await user.save();
      console.log(`State token saved for user ${req.user.id}`);
    } catch (dbError) {
      console.error('Error saving state token to user document:', dbError);
      return res.status(500).json({ success: false, error: 'Failed to save state token' });
    }
    
    res.json({
      success: true,
      data: { authUrl, state }
    });
  } catch (error) {
    console.error('Gmail auth URL error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate auth URL' });
  }
});

/**
 * @route   GET /api/gmail/callback
 * @desc    Handle Gmail OAuth callback
 * @access  Public (called by Google)
 */
router.get('/callback', async (req, res) => {
  try {
    console.log('Received OAuth callback from Google');
    const { code, state } = req.query;
    
    console.log('OAuth callback params:', { 
      hasCode: !!code, 
      hasState: !!state,
      stateValue: state
    });
    
    if (!code) {
      console.error('OAuth callback missing code parameter');
      return res.status(400).json({ success: false, error: 'Authorization code is missing' });
    }
    
    // Find user by state token
    const user = await User.findOne({ googleAuthState: state });
    
    if (!user) {
      console.error(`No user found with state token: ${state}`);
      return res.status(400).json({ success: false, error: 'Invalid state token' });
    }
    
    console.log(`Found user ${user._id} with matching state token`);
    
    // Exchange the code for tokens
    console.log('Exchanging authorization code for tokens');
    const tokens = await gmailAuth.getTokensFromCode(code);
    
    console.log('Successfully obtained tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'none'
    });
    
    // Save tokens to user document
    console.log(`Saving tokens to user ${user._id} document`);
    user.googleTokens = tokens;
    user.googleAuthState = null; // Clear the state token
    await user.save();
    console.log('Tokens saved successfully');
    
    // Redirect to frontend with success message
    const redirectUrl = `${process.env.FRONTEND_URL}/settings?gmailConnected=true`;
    console.log(`Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Gmail callback error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, error: 'Failed to process Google authentication' });
  }
});

/**
 * @route   POST /api/gmail/fetch
 * @desc    Fetch emails from Gmail
 * @access  Private
 */
router.post('/fetch', auth, async (req, res) => {
  try {
    // For demo user, just return success
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        message: 'Email fetch simulated for demo user'
      });
    }
    
    const result = await gmailFetcher.fetchAndProcessEmails(req.user.id, req.body);
    
    // If there's a scope error, tell the user to reconnect
    if (result.scopeError) {
      return res.status(403).json({ 
        success: false, 
        error: result.error,
        scopeError: true,
        details: result.details || 'Permission limitations detected',
        message: 'Please disconnect and reconnect your Gmail account to grant full permissions.'
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Gmail fetch error:', error);
    
    // Check for metadata scope errors
    if (error.message && (
      error.message.includes("Metadata scope doesn't allow") ||
      error.message.includes("Metadata scope does not support")
    )) {
      return res.status(403).json({
        success: false,
        error: 'Gmail permission issue: Please disconnect and reconnect your account to grant full permissions.',
        scopeError: true
      });
    }
    
    res.status(500).json({ success: false, error: 'Failed to fetch emails' });
  }
});

/**
 * @route   GET /api/gmail/status
 * @desc    Check Gmail connection status
 * @access  Private
 */
router.get('/status', auth, async (req, res) => {
  try {
    console.log(`Checking Gmail connection status for user ${req.user.id}`);
    
    // For demo user, return mock status
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        data: {
          connected: true,
          email: 'demo@example.com',
          syncInterval: 15,
          lastSync: new Date()
        }
      });
    }
    
    // Check if user has Gmail tokens
    const user = await User.findById(req.user.id);
    console.log(`User ${req.user.id} has Google tokens: ${!!user.googleTokens}`);
    
    if (!user.googleTokens) {
      console.log(`User ${req.user.id} is not connected to Gmail (no tokens)`);
      return res.json({
        success: true,
        data: {
          connected: false
        }
      });
    }
    
    // Get the authorized client
    console.log(`Getting authorized client for user ${req.user.id}`);
    const oauth2Client = await gmailAuth.getAuthorizedClient(req.user.id);
    const connected = !!oauth2Client;
    
    // Verify we can actually use the client by making a simple API call
    let fullyConnected = false;
    
    if (connected) {
      try {
        console.log(`Testing Gmail API connection for user ${req.user.id}`);
        const gmail = await require('../services/gmail/client').getGmailClient(req.user.id);
        
        if (gmail) {
          console.log(`Testing simple API call to Gmail for user ${req.user.id}`);
          // Make a simple call to see if we can access anything
          const profile = await gmail.users.getProfile({ userId: 'me' });
          fullyConnected = !!profile.data;
          console.log(`Gmail API test result for user ${req.user.id}: ${fullyConnected}`);
        } else {
          console.log(`Could not create Gmail client for user ${req.user.id}`);
        }
      } catch (apiError) {
        console.error(`Error testing Gmail API for user ${req.user.id}:`, apiError);
        fullyConnected = false;
      }
    }
    
    console.log(`User ${req.user.id} Gmail status: connected=${connected}, fullyConnected=${fullyConnected}`);
    
    res.json({
      success: true,
      data: {
        connected: fullyConnected,
        hasTokens: connected,
        email: user.email,
        syncInterval: user.syncInterval || 15,
        lastSync: user.lastEmailSync
      }
    });
  } catch (error) {
    console.error('Gmail status error:', error);
    res.status(500).json({ success: false, error: 'Failed to check Gmail status' });
  }
});

/**
 * @route   POST /api/gmail/disconnect
 * @desc    Disconnect Gmail integration
 * @access  Private
 */
router.post('/disconnect', auth, async (req, res) => {
  try {
    // For demo user, just return success
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        message: 'Gmail disconnected for demo user'
      });
    }
    
    const success = await gmailAuth.revokeTokensAndDisconnect(req.user.id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Gmail disconnected successfully'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to disconnect Gmail' 
      });
    }
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect Gmail' });
  }
});

/**
 * @route   POST /api/gmail/sync-interval
 * @desc    Update Gmail sync interval
 * @access  Private
 */
router.post('/sync-interval', auth, async (req, res) => {
  try {
    const { interval } = req.body;
    
    if (interval === undefined || typeof interval !== 'number' || interval < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid sync interval' 
      });
    }
    
    // For demo user, just return success
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        data: {
          syncInterval: interval
        },
        message: 'Sync interval updated for demo user'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    user.syncInterval = interval;
    await user.save();
    
    res.json({
      success: true,
      data: {
        syncInterval: user.syncInterval
      },
      message: 'Sync interval updated successfully'
    });
  } catch (error) {
    console.error('Update sync interval error:', error);
    res.status(500).json({ success: false, error: 'Failed to update sync interval' });
  }
});

/**
 * @route   POST /api/gmail/reset-tokens
 * @desc    Reset Gmail tokens for debugging
 * @access  Private
 */
router.post('/reset-tokens', auth, async (req, res) => {
  try {
    console.log('Resetting Gmail tokens for user:', req.user.id);
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Clear tokens and state
    user.googleTokens = null;
    user.googleAuthState = null;
    await user.save();
    
    console.log(`Gmail tokens and state cleared for user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Gmail tokens reset successfully. You can now reconnect with full permissions.'
    });
  } catch (error) {
    console.error('Reset tokens error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset Gmail tokens' });
  }
});

/**
 * @route   POST /api/gmail/test-connection
 * @desc    Test if Gmail connection is working
 * @access  Private
 */
router.post('/test-connection', auth, async (req, res) => {
  try {
    console.log(`Testing Gmail connection for user ${req.user.id}`);
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (!user.googleTokens) {
      return res.json({ 
        success: true, 
        connected: false,
        message: 'No Google tokens found. User is not connected to Gmail.'
      });
    }
    
    // Log token info
    console.log('Token info:', {
      hasAccessToken: !!user.googleTokens.access_token,
      accessTokenPrefix: user.googleTokens.access_token ? user.googleTokens.access_token.substring(0, 10) + '...' : 'none',
      hasRefreshToken: !!user.googleTokens.refresh_token,
      refreshTokenPrefix: user.googleTokens.refresh_token ? user.googleTokens.refresh_token.substring(0, 10) + '...' : 'none',
      expiry: user.googleTokens.expiry_date ? new Date(user.googleTokens.expiry_date).toISOString() : 'none',
      tokenType: user.googleTokens.token_type || 'none',
      idToken: user.googleTokens.id_token ? 'present' : 'missing'
    });
    
    // Try to get a Gmail client
    const gmail = await require('../services/gmail/client').getGmailClient(req.user.id);
    
    if (!gmail) {
      return res.json({
        success: true,
        connected: false,
        message: 'Failed to create Gmail client. Tokens may be invalid.'
      });
    }
    
    // Try to make a simple API call
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      // Try to get labels to test more permissions
      let labelTest = {};
      try {
        const labels = await gmail.users.labels.list({ userId: 'me' });
        labelTest = {
          labelsAccessible: true,
          labelCount: labels.data.labels?.length || 0
        };
      } catch (labelError) {
        labelTest = {
          labelsAccessible: false,
          error: labelError.message
        };
      }
      
      // Check scope permissions
      let scopeInfo = {};
      try {
        // Try to tokeninfo endpoint to check actual scopes
        const { google } = require('googleapis');
        const oauth2 = google.oauth2('v2');
        
        // Get the OAuth client
        const oauth2Client = await gmailAuth.getAuthorizedClient(req.user.id);
        
        if (oauth2Client) {
          // Check token info which includes the granted scopes
          const tokenInfo = await oauth2.tokeninfo({
            access_token: oauth2Client.credentials.access_token
          });
          
          scopeInfo = {
            scopes: tokenInfo.data.scope ? tokenInfo.data.scope.split(' ') : [],
            hasGmailModify: tokenInfo.data.scope && tokenInfo.data.scope.includes('https://www.googleapis.com/auth/gmail.modify'),
            hasGmailReadonly: tokenInfo.data.scope && tokenInfo.data.scope.includes('https://www.googleapis.com/auth/gmail.readonly'),
            hasFullAccess: tokenInfo.data.scope && tokenInfo.data.scope.includes('https://mail.google.com/'),
            expiresIn: tokenInfo.data.expires_in,
            email: tokenInfo.data.email
          };
        }
      } catch (scopeError) {
        console.error('Error checking scopes:', scopeError);
        scopeInfo = {
          error: scopeError.message,
          couldNotCheck: true
        };
      }
      
      // Test message list access with full format
      let fullAccessTest = {};
      try {
        const testMessage = await gmail.users.messages.list({
          userId: 'me',
          maxResults: 1
        });
        
        if (testMessage.data.messages && testMessage.data.messages.length > 0) {
          const messageId = testMessage.data.messages[0].id;
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full'
          });
          
          fullAccessTest = {
            canAccessFullMessages: true,
            hasPayload: !!fullMessage.data.payload,
            hasBody: fullMessage.data.payload && 
                     fullMessage.data.payload.body && 
                     !!fullMessage.data.payload.body.data
          };
        } else {
          fullAccessTest = {
            canAccessFullMessages: 'unknown - no messages found'
          };
        }
      } catch (fullAccessError) {
        fullAccessTest = {
          canAccessFullMessages: false,
          error: fullAccessError.message
        };
      }
      
      return res.json({
        success: true,
        connected: true,
        profileData: {
          emailAddress: profile.data.emailAddress,
          messagesTotal: profile.data.messagesTotal,
          threadsTotal: profile.data.threadsTotal,
          historyId: profile.data.historyId
        },
        labelTest,
        scopeInfo,
        fullAccessTest,
        message: 'Gmail connection is working properly.'
      });
    } catch (apiError) {
      return res.json({
        success: true,
        connected: false,
        error: apiError.message,
        message: 'Gmail connection failed at API level. Tokens may need to be refreshed.'
      });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ success: false, error: 'Failed to test Gmail connection' });
  }
});

module.exports = router;