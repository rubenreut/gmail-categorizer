/**
 * Email synchronization service
 * This service handles bidirectional syncing between Gmail and our app
 */
const User = require('../models/User');
const Email = require('../models/Email');
const gmailFetcher = require('./gmail/fetcher');
const gmailClient = require('./gmail/client');

// Default interval in minutes between global syncs
const DEFAULT_SYNC_INTERVAL = parseInt(process.env.EMAIL_SYNC_INTERVAL, 10) || 10; // In minutes
// Convert to milliseconds
const DEFAULT_SYNC_INTERVAL_MS = DEFAULT_SYNC_INTERVAL * 60 * 1000;

// Track last modification date by user
const userLastModified = new Map();

// Flag to track if sync is running
let isSyncRunning = false;

// Track last sync time for each user
const userLastSyncTime = new Map();

/**
 * Start periodic email synchronization
 */
function startEmailSync() {
  console.log(`Starting email sync service (default interval: ${DEFAULT_SYNC_INTERVAL} minutes)`);
  
  // Run initial sync after 1 minute
  setTimeout(syncAllUsers, 60000);
  
  // Set up periodic check (every minute)
  setInterval(checkForUserSync, 60000);
  
  // Also set up a backup global sync at the default interval
  // This ensures we catch any users that might be missed
  setInterval(syncAllUsers, DEFAULT_SYNC_INTERVAL_MS);
}

/**
 * Check which users need syncing based on their individual sync intervals
 */
async function checkForUserSync() {
  if (isSyncRunning) {
    return; // Don't start new sync checks while a sync is running
  }
  
  try {
    // Find all users with Gmail integration
    const users = await User.find({
      googleTokens: { $exists: true, $ne: null }
    });
    
    if (users.length === 0) return;
    
    const now = Date.now();
    const usersToSync = [];
    
    // Check each user's sync interval
    for (const user of users) {
      // Skip users with sync interval set to 0 (manual sync only)
      if (user.syncInterval === 0) continue;
      
      const userId = user._id.toString();
      // Parse sync interval with fallback and validation
      const userSyncInterval = user.syncInterval ? parseInt(user.syncInterval, 10) : DEFAULT_SYNC_INTERVAL;
      const syncIntervalMin = Math.max(1, Math.min(userSyncInterval, 60)); // Between 1 and 60 minutes
      const interval = syncIntervalMin * 60 * 1000; // Convert to ms
      const lastSync = userLastSyncTime.get(userId) || 0;
      
      // Check if enough time has passed since last sync
      if (now - lastSync >= interval) {
        usersToSync.push(user);
        userLastSyncTime.set(userId, now);
      }
    }
    
    // If we have users to sync, start a sync operation
    if (usersToSync.length > 0) {
      syncSpecificUsers(usersToSync);
    }
  } catch (error) {
    console.error('Error checking for user syncs:', error);
  }
}

/**
 * Common sync function to handle syncing emails for users
 * @param {Array} users Array of user documents
 * @param {boolean} isAllUsers Whether this is syncing all users or specific ones
 */
async function syncUsers(users, isAllUsers = false) {
  // Prevent multiple syncs from running at the same time
  if (isSyncRunning) {
    console.log('Sync already in progress, skipping');
    return;
  }
  
  isSyncRunning = true;
  console.log(`Starting email sync for ${isAllUsers ? 'all' : users.length} users...`);
  
  try {
    // Sync each user (except those with sync interval set to 0)
    for (const user of users) {
      // Skip users with sync interval set to 0 (manual sync only)
      if (user.syncInterval === 0) continue;
      
      await syncUserEmails(user);
      
      // Update the last sync time in our tracking map
      userLastSyncTime.set(user._id.toString(), Date.now());
    }
    
    console.log(`Email sync completed for ${users.length} users`);
  } catch (error) {
    console.error('Error in email sync:', error);
  } finally {
    isSyncRunning = false;
  }
}

/**
 * Sync emails for specific users
 * @param {Array} users Array of user documents
 */
async function syncSpecificUsers(users) {
  await syncUsers(users, false);
}

/**
 * Sync emails for all users that have Gmail integration
 */
async function syncAllUsers() {
  try {
    // Find users with Google tokens
    const users = await User.find({
      googleTokens: { $exists: true, $ne: null }
    });
    
    console.log(`Found ${users.length} users with Gmail integration`);
    await syncUsers(users, true);
  } catch (error) {
    console.error('Error finding users for sync:', error);
    isSyncRunning = false;
  }
}

/**
 * Sync emails for a specific user
 * @param {Object} user User document
 * @param {boolean} fullSync Whether to perform a full historical sync
 * @param {boolean} forceComplete Whether to force a complete sync of ALL emails (ignores limits)
 */
async function syncUserEmails(user, fullSync = false, forceComplete = false) {
  console.log(`Syncing emails for user: ${user.email}, fullSync: ${fullSync}, forceComplete: ${forceComplete}`);
  
  try {
    // Step 1: Sync from Gmail to our app
    const fromGmailResult = await syncFromGmail(user, fullSync, forceComplete);
    
    // Step 2: Sync changes from our app to Gmail (read status, labels, etc.)
    const toGmailResult = await syncToGmail(user);
    
    // Update will be handled by the caller if forceComplete is true
    if (!forceComplete) {
      user.lastEmailSync = new Date();
      await user.save();
    }
    
    const totalCount = fromGmailResult.count || 0;
    console.log(`Completed bidirectional sync for ${user.email}: ${totalCount} emails processed`);
    
    return {
      success: true,
      message: `Successfully processed ${totalCount} emails`,
      count: totalCount,
      fromGmail: fromGmailResult.count || 0,
      toGmail: toGmailResult.count || 0
    };
  } catch (error) {
    console.error(`Error syncing emails for user ${user.email}:`, error);
    return {
      success: false,
      error: `Failed to sync emails: ${error.message}`
    };
  }
}

/**
 * Sync emails from Gmail to our app
 * @param {Object} user User document
 * @param {boolean} fullSync Whether to perform a full historical sync
 * @param {boolean} forceComplete Whether to force a complete sync of ALL emails (ignores limits)
 */
async function syncFromGmail(user, fullSync = false, forceComplete = false) {
  try {
    // Only filter by date if not doing a full sync and we have a last sync time
    let query = '';
    
    if (!fullSync && user.lastEmailSync) {
      // Format date for Gmail query
      const lastSyncDate = new Date(user.lastEmailSync);
      const formattedDate = lastSyncDate.toISOString().substring(0, 10); // YYYY-MM-DD format
      query = `after:${formattedDate}`;
    }
    
    // Fetch in batches - first unread emails
    const unreadOptions = {
      maxResults: 100,
      labelIds: ['INBOX'],
      query: query ? `is:unread ${query}` : 'is:unread'
    };
    
    console.log(`Fetching unread emails for ${user.email} with query: ${unreadOptions.query}`);
    const unreadResult = await gmailFetcher.fetchAndProcessEmails(user._id, unreadOptions);
    console.log(`Processed ${unreadResult.count || 0} unread emails`);
    
    // Then fetch ALL read emails if doing full sync
    let readResult = { count: 0 };
    if (fullSync || forceComplete) {
      // For forceComplete, prioritize getting EVERYTHING from ALL_MAIL and other critical places
      if (forceComplete) {
        // Check how many emails we currently have in database
        const Email = require('../models/Email');
        const currentEmailCount = await Email.countDocuments({ userId: user._id });
        console.log(`FORCE COMPLETE mode - Currently have ${currentEmailCount} emails for ${user.email} in database before sync`);
        
        // First, update tokens if needed to ensure we have all required permissions
        const gmailAuth = require('./gmail/auth');
        try {
          console.log('Checking and updating Google tokens if needed...');
          // Use the User model we already imported at the top
          const userObject = await User.findById(user._id);
          if (userObject && userObject.googleTokens) {
            // Refresh the token to make sure we have the latest
            const oauth2Client = gmailAuth.createOAuth2Client();
            oauth2Client.setCredentials(userObject.googleTokens);
            try {
              const { credentials } = await oauth2Client.refreshAccessToken();
              userObject.googleTokens = credentials;
              await userObject.save();
              console.log('Google tokens refreshed successfully');
            } catch (refreshError) {
              console.warn('Could not refresh token, using existing one:', refreshError.message);
            }
          }
        } catch (authError) {
          console.error('Error updating auth tokens:', authError);
        }
        
        // Use a structured approach to fetch emails from all mailboxes
        
        // Only retrieve labels in development or when requested
        if (process.env.NODE_ENV === 'development' || forceComplete) {
          try {
            console.log("Getting all available Gmail labels to find the right ones...");
            const gmail = await gmailClient.getGmailClient(user._id);
            if (gmail) {
              const labelResponse = await gmail.users.labels.list({ userId: 'me' });
              const availableLabels = labelResponse.data.labels || [];
              if (process.env.NODE_ENV === 'development') {
                console.log("Available Gmail labels:", availableLabels.map(l => `${l.id} (${l.name})`).join(', '));
              }
            }
          } catch (labelError) {
            console.error("Error getting labels:", labelError.message);
          }
        }
        
        // Try getting all emails with empty query (should return everything)
        const allMailOptions1 = {
          maxResults: 50000, // Very large number
          labelIds: [], // No label filter to get EVERYTHING
          query: '', // Empty query should return all emails
          fetchAll: true,
          finalPass: true
        };
        
        console.log('APPROACH 1: Fetching ALL emails using special query...');
        const allMailResult1 = await gmailFetcher.fetchAndProcessEmails(user._id, allMailOptions1);
        readResult.count += allMailResult1.count || 0;
        console.log(`Fetched ${allMailResult1.count || 0} emails from approach 1`);
        
        // Second approach: Use special query to get all mail
        const allMailOptions2 = {
          maxResults: 50000,
          labelIds: [], // No label filter to get everything
          query: 'in:anywhere',
          fetchAll: true,
          finalPass: true
        };
        
        console.log('APPROACH 2: Fetching ALL emails using special query...');
        const allMailResult2 = await gmailFetcher.fetchAndProcessEmails(user._id, allMailOptions2);
        readResult.count += allMailResult2.count || 0;
        console.log(`Fetched ${allMailResult2.count || 0} emails from approach 2`);
        
        // Get ALL emails with effective queries to ensure we capture everything
        // Gmail doesn't have a true "all mail" query, so we use combinations
        const specialLabels = [
          // First, try to get all emails with various inclusive queries
          { name: 'Everything', query: '' }, // Empty query should get everything
          { name: 'All Mail', query: 'in:anywhere' },
          
          // Then cover specific areas Gmail might exclude from general queries
          { name: 'Inbox', query: 'in:inbox' },
          { name: 'Spam', query: 'in:spam' },
          { name: 'Trash', query: 'in:trash' },
          { name: 'Drafts', query: 'in:drafts' },
          { name: 'Sent', query: 'in:sent' },
          
          // Try by read/unread status
          { name: 'Unread', query: 'is:unread' },
          { name: 'Read', query: 'is:read' },
          
          // Try by year ranges to get ALL historical emails
          { name: 'Pre-2020', query: 'before:2020/01/01' },
          { name: 'Post-2020', query: 'after:2019/12/31' },
          
          // Try special Gmail categories
          { name: 'Primary', query: 'category:primary' },
          { name: 'Social', query: 'category:social' },
          { name: 'Promotions', query: 'category:promotions' },
          { name: 'Updates', query: 'category:updates' },
          { name: 'Forums', query: 'category:forums' }
        ];
        
        for (const label of specialLabels) {
          console.log(`DIRECT QUERY: Fetching emails using query "${label.query}"...`);
          const specialOptions = {
            maxResults: 50000,
            labelIds: [],
            query: label.query,
            fetchAll: true,
            finalPass: true
          };
          
          const specialResult = await gmailFetcher.fetchAndProcessEmails(user._id, specialOptions);
          readResult.count += specialResult.count || 0;
          console.log(`Fetched ${specialResult.count || 0} emails from ${label.name}`);
        }
      }
      
      // Instead of using time-based batches with maxResults limits, 
      // we'll use a different approach to get absolutely ALL emails
      
      // First, process just the INBOX for read emails (no date filtering)
      console.log(`Fetching ALL read emails from INBOX for ${user.email}`);
      
      const inboxReadOptions = {
        maxResults: 10000, // Very large number to try to get all emails
        labelIds: ['INBOX'],
        query: 'is:read',
        fetchAll: true // Special flag to indicate we want all emails
      };
      
      const inboxReadResult = await gmailFetcher.fetchAndProcessEmails(user._id, inboxReadOptions);
      readResult.count += inboxReadResult.count || 0;
      
      // Now also fetch from other common labels/categories with NO LIMITS
      // to ensure we get ALL emails from Gmail
      const labels = [
        { id: 'CATEGORY_PERSONAL', name: 'Personal', maxResults: 10000 },
        { id: 'CATEGORY_SOCIAL', name: 'Social', maxResults: 10000 },
        { id: 'CATEGORY_PROMOTIONS', name: 'Promotions', maxResults: 10000 },
        { id: 'CATEGORY_UPDATES', name: 'Updates', maxResults: 10000 },
        { id: 'CATEGORY_FORUMS', name: 'Forums', maxResults: 10000 },
        { id: 'SENT', name: 'Sent', maxResults: 10000 },
        { id: 'IMPORTANT', name: 'Important', maxResults: 10000 },
        { id: 'CHAT', name: 'Chat', maxResults: 10000 },
        { id: 'SPAM', name: 'Spam', maxResults: 10000 },
        { id: 'TRASH', name: 'Trash', maxResults: 10000 },
        { id: 'DRAFT', name: 'Drafts', maxResults: 10000 },
        { id: 'STARRED', name: 'Starred', maxResults: 10000 }
      ];
      
      // Process each label to make sure we get emails that might not be in INBOX
      for (const label of labels) {
        console.log(`Fetching emails from ${label.name} category for ${user.email}`);
        
        // Both read and unread, with NO LIMITS to get ABSOLUTELY ALL emails
        const labelOptions = {
          maxResults: label.maxResults || 10000, // Use high limit
          labelIds: [label.id],
          query: '',  // No query filter to get all emails
          fetchAll: true // Fetch ALL emails without limits
        };
        
        const labelResult = await gmailFetcher.fetchAndProcessEmails(user._id, labelOptions);
        console.log(`Fetched ${labelResult.count || 0} emails from ${label.name}`);
        readResult.count += labelResult.count || 0;
        
        // Short pause between label processing
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const totalCount = (unreadResult.count || 0) + (readResult.count || 0);
    return {
      success: true,
      count: totalCount
    };
  } catch (error) {
    console.error(`Error syncing from Gmail for user ${user.email}:`, error);
    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
}

/**
 * Sync changes from our app to Gmail
 * @param {Object} user User document
 */
async function syncToGmail(user) {
  try {
    const gmail = await gmailClient.getGmailClient(user._id);
    
    if (!gmail) {
      console.log(`Gmail client not available for user ${user.email}`);
      return { success: false, count: 0 };
    }
    
    // Get the timestamp of the last sync to Gmail
    const lastModified = userLastModified.get(user._id.toString()) || 0;
    
    // Find emails that have been modified since the last sync
    const modifiedSince = new Date(lastModified);
    
    // Find emails that have been updated since last sync
    // Only care about read/unread status for now
    const modifiedEmails = await Email.find({
      userId: user._id,
      updatedAt: { $gt: modifiedSince }
    }).select('emailProviderId isRead categories updatedAt');
    
    console.log(`Found ${modifiedEmails.length} emails modified since last sync for user ${user.email}`);
    
    if (modifiedEmails.length === 0) {
      return { success: true, count: 0 };
    }
    
    let successCount = 0;
    let latestUpdateTime = lastModified;
    
    // Process emails in batches to avoid overwhelming the API
    const BATCH_SIZE = 20;
    for (let i = 0; i < modifiedEmails.length; i += BATCH_SIZE) {
      const batch = modifiedEmails.slice(i, i + BATCH_SIZE);
      
      // Process this batch in parallel
      const results = await Promise.allSettled(
        batch.map(async (email) => {
          // Track latest update time
          if (email.updatedAt.getTime() > latestUpdateTime) {
            latestUpdateTime = email.updatedAt.getTime();
          }
          
          // Update read/unread status in Gmail
          try {
            // Skip updating emails to Gmail for now to avoid permission issues
            // We'll focus on just syncing FROM Gmail to our app
            
            // Only attempt to modify Gmail labels if we have the right permissions
            try {
              // Verify we have the right permissions first
              const tokenInfo = await gmail.getTokenInfo(gmail.credentials.access_token);
              const hasFullAccess = tokenInfo.scope.includes('https://mail.google.com/');
              
              if (hasFullAccess) {
                // Update read status in Gmail based on our app's status
                const modifyParams = {
                  userId: 'me',
                  id: email.emailProviderId,
                  resource: {
                    [email.isRead ? 'removeLabelIds' : 'addLabelIds']: ['UNREAD']
                  }
                };
                
                await gmail.users.messages.modify(modifyParams);
                return true;
              } else {
                console.log('Insufficient permissions to modify Gmail labels');
                return true; // Still return true as we don't want to fail the sync
              }
            } catch (permissionError) {
              console.log('Permission check failed, skipping label update:', permissionError.message);
              return true; // Still return true as we don't want to fail the sync
            }
            return true;
          } catch (error) {
            console.error(`Error updating email ${email.emailProviderId} in Gmail:`, error);
            return false;
          }
        })
      );
      
      // Count successful updates
      successCount += results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    }
    
    // Update the last modified timestamp
    if (latestUpdateTime > lastModified) {
      userLastModified.set(user._id.toString(), latestUpdateTime);
    }
    
    console.log(`Synced ${successCount} email changes to Gmail for user ${user.email}`);
    
    return {
      success: true,
      count: successCount
    };
  } catch (error) {
    console.error(`Error syncing to Gmail for user ${user.email}:`, error);
    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
}

module.exports = {
  startEmailSync,
  syncAllUsers,
  syncSpecificUsers,
  syncUserEmails,
  checkForUserSync
};