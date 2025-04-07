const { google } = require('googleapis');
const User = require('../../models/User');

/**
 * Create an OAuth2 client for Gmail API
 * @returns {google.auth.OAuth2} OAuth2 client
 */
function createOAuth2Client(customRedirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = customRedirectUri || process.env.GOOGLE_REDIRECT_URI;
  
  if (!clientId || !clientSecret || !redirectUri) {
    console.error('OAuth credentials missing:',
      { 
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri
      }
    );
    throw new Error('Missing required OAuth credentials. Check your .env file.');
  }
  
  // Only log in development environment
  if (process.env.NODE_ENV === 'development') {
    console.log('Creating OAuth2 client with redirectUri:', redirectUri);
  }
  
  try {
    const oauthClient = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    
    console.log('OAuth2 client created successfully');
    return oauthClient;
  } catch (error) {
    console.error('Error creating OAuth2 client:', error);
    throw new Error('Failed to create OAuth2 client: ' + error.message);
  }
}

/**
 * Generate an authorization URL for Gmail API
 * @param {string} [redirectUri] Optional custom redirect URI
 * @returns {Object} Auth URL and state token
 */
function getAuthUrl(redirectUri) {
  // Create OAuth client with the custom redirect URI
  const oauth2Client = createOAuth2Client(redirectUri);
  
  // Generate a random state token
  const state = Math.random().toString(36).substring(2, 15);
  
  // Only log in development environment
  if (process.env.NODE_ENV === 'development') {
    console.log('Creating OAuth URL with redirectUri:', redirectUri || process.env.GOOGLE_REDIRECT_URI);
  }
  
  // Define scopes with all Gmail permissions
  const scopes = [
    'https://www.googleapis.com/auth/gmail.modify', // Allow changing labels
    'https://www.googleapis.com/auth/gmail.metadata', // Metadata access
    'https://www.googleapis.com/auth/gmail.readonly', // Read-only access
    'https://mail.google.com/', // Full mailbox access
    'https://www.googleapis.com/auth/userinfo.email', // User email
    'https://www.googleapis.com/auth/userinfo.profile' // User profile
  ];
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Using the following scopes:', scopes.join(', '));
  }
  
  // Force approval prompt to ensure we get fresh consent with all scopes
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    response_type: 'code',
    scope: scopes,
    prompt: 'consent', // Always show consent screen to ensure we get a refresh token
    state,
    include_granted_scopes: true,
    redirect_uri: redirectUri
    // Note: Don't use both prompt and approval_prompt - they conflict
  });
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Generated auth URL length:', authUrl.length);
  }
  
  return { authUrl, state };
}

/**
 * Exchange authorization code for tokens
 * @param {string} code Authorization code
 * @returns {Object} Token response
 */
async function getTokensFromCode(code, redirectUri) {
  try {
    console.log('Exchanging authorization code for tokens...');
    
    if (!code) {
      console.error('No authorization code provided to getTokensFromCode');
      throw new Error('Authorization code is required');
    }
    
    // Create OAuth client with the custom redirect URI
    const oauth2Client = createOAuth2Client(redirectUri);
    
    console.log('OAuth client created, getting tokens from code with redirect URI:', 
      redirectUri || process.env.GOOGLE_REDIRECT_URI);
    
    const response = await oauth2Client.getToken(code);
    console.log('Token response received, has tokens:', !!response.tokens);
    
    if (!response.tokens) {
      console.error('No tokens in response');
      throw new Error('Failed to get tokens from authorization code');
    }
    
    console.log('Tokens received successfully:', { 
      hasAccessToken: !!response.tokens.access_token,
      hasRefreshToken: !!response.tokens.refresh_token,
      expiryDate: response.tokens.expiry_date ? new Date(response.tokens.expiry_date).toISOString() : 'none'
    });
    
    return response.tokens;
  } catch (error) {
    console.error('Error getting tokens from code:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw error; // Rethrow to handle at the route level
  }
}

/**
 * Get OAuth2 client with user's tokens
 * @param {string} userId User ID
 * @returns {google.auth.OAuth2} Authorized OAuth2 client or null
 */
async function getAuthorizedClient(userId, redirectUri) {
  try {
    console.log(`Getting authorized client for user ${userId}`);
    const user = await User.findById(userId);
    
    if (!user) {
      console.log(`User ${userId} not found`);
      return null;
    }
    
    if (!user.googleTokens) {
      console.log(`User ${userId} has no Google tokens`);
      return null;
    }
    
    console.log(`User ${userId} has tokens:`, {
      hasAccessToken: !!user.googleTokens.access_token,
      hasRefreshToken: !!user.googleTokens.refresh_token,
      expiry: user.googleTokens.expiry_date ? new Date(user.googleTokens.expiry_date).toISOString() : 'none'
    });
    
    const oauth2Client = createOAuth2Client(redirectUri);
    oauth2Client.setCredentials(user.googleTokens);
    
    // Always try to refresh the token to ensure it's fresh
    // This is more reliable than checking expiry_date
    try {
      console.log(`Attempting to refresh token for user ${userId}`);
      
      if (!user.googleTokens.refresh_token) {
        console.log(`Cannot refresh token - no refresh token available for user ${userId}`);
        return oauth2Client;
      }
      
      const { credentials } = await oauth2Client.refreshAccessToken();
      console.log(`Token refreshed successfully for user ${userId}`);
      
      // Update user's tokens in the database while preserving the refresh token
      // Sometimes the refresh token doesn't come back in the response
      if (!credentials.refresh_token && user.googleTokens.refresh_token) {
        credentials.refresh_token = user.googleTokens.refresh_token;
      }
      
      user.googleTokens = credentials;
      await user.save();
      console.log(`Updated tokens saved for user ${userId}`);
      
      oauth2Client.setCredentials(credentials);
      return oauth2Client;
    } catch (error) {
      console.error(`Error refreshing token for user ${userId}:`, error);
      
      // If refresh fails, the token might be invalid or revoked
      // But we'll still return the client with the old token
      // so that the caller can handle the error appropriately
      return oauth2Client;
    }
  } catch (error) {
    console.error('Error getting authorized client:', error);
    return null;
  }
}

/**
 * Revoke Google access tokens and remove from user account
 * @param {string} userId User ID
 * @returns {boolean} Success status
 */
async function revokeTokensAndDisconnect(userId, redirectUri) {
  try {
    console.log(`Disconnecting Gmail for user ${userId}`);
    const user = await User.findById(userId);
    
    if (!user) {
      console.log(`User ${userId} not found`);
      return false;
    }
    
    if (!user.googleTokens) {
      console.log(`User ${userId} has no Google tokens - already disconnected`);
      return true; // Already disconnected
    }
    
    console.log(`Creating OAuth client for token revocation`);
    const oauth2Client = createOAuth2Client(redirectUri);
    oauth2Client.setCredentials(user.googleTokens);
    
    // Try to revoke access token at Google
    try {
      console.log(`Revoking access token at Google`);
      await oauth2Client.revokeToken(user.googleTokens.access_token);
      console.log(`Token successfully revoked at Google`);
    } catch (error) {
      console.warn('Could not revoke token at Google:', error.message);
      // Continue anyway - we'll still remove from our database
    }
    
    // Remove tokens from user record
    console.log(`Clearing tokens from user record in database`);
    user.googleTokens = null;
    await user.save();
    console.log(`User ${userId} successfully disconnected from Gmail`);
    
    return true;
  } catch (error) {
    console.error('Error disconnecting Gmail account:', error);
    return false;
  }
}

/**
 * Get user info from Google using access token
 * @param {Object} tokens Google OAuth tokens
 * @returns {Object} User profile information
 */
async function getUserInfoFromTokens(tokens, redirectUri) {
  try {
    console.log('getUserInfoFromTokens called with tokens:', { 
      hasAccessToken: !!tokens?.access_token, 
      hasRefreshToken: !!tokens?.refresh_token,
      tokenExpiry: tokens?.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'none'
    });
    
    if (!tokens || !tokens.access_token) {
      console.error('Invalid tokens provided to getUserInfoFromTokens');
      return null;
    }
    
    const oauth2Client = createOAuth2Client(redirectUri);
    oauth2Client.setCredentials(tokens);
    
    const google = require('googleapis').google;
    const oauth2 = google.oauth2('v2');
    
    console.log('Making request to Google userinfo API...');
    const userInfoResponse = await oauth2.userinfo.get({ auth: oauth2Client });
    
    console.log('User info received:', userInfoResponse.data);
    return userInfoResponse.data;
  } catch (error) {
    console.error('Error getting user info from Google:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return null;
  }
}

module.exports = {
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  getAuthorizedClient,
  revokeTokensAndDisconnect,
  getUserInfoFromTokens
};