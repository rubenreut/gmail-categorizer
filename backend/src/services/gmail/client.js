const { google } = require('googleapis');
const auth = require('./auth');

/**
 * Get Gmail API client for a user
 * @param {string} userId User ID
 * @returns {Object} Gmail API client or null
 */
async function getGmailClient(userId) {
  try {
    const oauth2Client = await auth.getAuthorizedClient(userId);
    
    if (!oauth2Client) {
      return null;
    }
    
    return google.gmail({ version: 'v1', auth: oauth2Client });
  } catch (error) {
    console.error('Error getting Gmail client:', error);
    return null;
  }
}

module.exports = {
  getGmailClient
};