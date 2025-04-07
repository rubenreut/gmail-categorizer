const { getGmailClient } = require('./client');
const Email = require('../../models/Email');
const categorizer = require('../../ai/categorizer');

/**
 * Decode a base64 email message
 * @param {string} encodedBody Base64 encoded email
 * @returns {string} Decoded email
 */
function decodeBase64(encodedBody) {
  return Buffer.from(encodedBody, 'base64').toString('utf-8');
}

/**
 * Parse an email message
 * @param {Object} message Gmail message object
 * @returns {Object} Parsed email data
 */
function parseEmailMessage(message) {
  const payload = message.payload || {};
  const headers = payload.headers || [];
  const labelIds = message.labelIds || [];
  
  // Extract email data from headers
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  const from = headers.find(h => h.name === 'From')?.value || '';
  const to = headers.find(h => h.name === 'To')?.value || '';
  const date = headers.find(h => h.name === 'Date')?.value || '';
  
  // Parse from field to get name and email
  const fromMatch = from.match(/(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)/);
  const fromName = fromMatch ? fromMatch[1] || '' : '';
  const fromEmail = fromMatch ? fromMatch[2] || '' : from;
  
  // Parse to field to get name and email (could be multiple)
  // Handle empty 'to' field more gracefully for metadata-only access
  const toAddresses = to ? to.split(',').map(address => {
    const match = address.trim().match(/(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)/);
    return {
      name: match ? match[1] || '' : '',
      email: match ? match[2] || '' : address.trim()
    };
  }) : [];
  
  // Parse email body
  let bodyText = '';
  let bodyHtml = '';
  
  // Check if we have a payload with parts (in case of metadata-only access)
  if (payload) {
    // Search for the text and html parts
    function findBodyParts(part) {
      if (!part) return;
      
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        bodyText = decodeBase64(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
        bodyHtml = decodeBase64(part.body.data);
      } else if (part.parts) {
        part.parts.forEach(findBodyParts);
      }
    }
    
    if (payload.body && payload.body.data) {
      // Simple message with just a body
      try {
        bodyText = decodeBase64(payload.body.data);
      } catch (error) {
        console.log(`Error decoding body for message ${message.id}: ${error.message}`);
        bodyText = '(Error decoding content)';
      }
    } else if (payload.parts) {
      // Multipart message
      payload.parts.forEach(findBodyParts);
    }
  } 
  
  // For metadata-only messages or if we couldn't extract a body
  if (!bodyText && !bodyHtml) {
    bodyText = '(Content not available with current permissions)';
  }
  
  // Extract attachments
  const attachments = [];
  
  // Only try to find attachments if we have a payload with parts
  if (payload && payload.parts) {
    function findAttachments(part) {
      if (!part) return;
      
      if (part.filename && part.filename.length > 0 && part.body) {
        attachments.push({
          filename: part.filename,
          contentType: part.mimeType,
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId
        });
      }
      
      if (part.parts) {
        part.parts.forEach(findAttachments);
      }
    }
    
    payload.parts.forEach(findAttachments);
  }
  
  // Try to parse the date, but use current date as fallback
  let receivedDate;
  try {
    receivedDate = date ? new Date(date) : new Date();
    // Check if the date is valid
    if (isNaN(receivedDate.getTime())) {
      receivedDate = new Date();
    }
  } catch (error) {
    console.log(`Error parsing date for message ${message.id}: ${error.message}`);
    receivedDate = new Date();
  }
  
  // Create email data object with safer defaults
  return {
    emailProviderId: message.id,
    threadId: message.threadId || message.id, // Fallback to message ID if threadId is missing
    from: {
      name: fromName,
      email: fromEmail || 'unknown@example.com' // Provide fallback
    },
    to: toAddresses.length > 0 ? toAddresses : [{ name: '', email: '' }],
    subject: subject || '(No subject)',
    body: {
      text: bodyText,
      html: bodyHtml
    },
    receivedAt: receivedDate,
    isRead: !labelIds.includes('UNREAD'),
    metadata: {
      importance: labelIds.includes('IMPORTANT') ? 'high' : 'normal',
      hasAttachments: attachments.length > 0,
      isMetadataOnly: !bodyText.includes('Content not available') ? false : true
    },
    attachments
  };
}

/**
 * Fetch and process emails for a user
 * @param {string} userId User ID
 * @param {Object} options Options for fetching emails
 * @returns {Promise<Object>} Result of email fetching
 */
async function fetchAndProcessEmails(userId, options = {}) {
  try {
    const gmail = await getGmailClient(userId);
    
    if (!gmail) {
      return { success: false, error: 'Gmail client not available' };
    }
    
    // Set default options
    const maxResults = options.maxResults || 100;
    const labelIds = options.labelIds || ['INBOX'];
    const q = options.query || '';
    const fetchAll = options.fetchAll || false;
    const finalPass = options.finalPass || false;
    
    let messages = [];
    let nextPageToken = null;
    let totalPages = 0;
    let totalFetchedCount = 0;
    
    console.log(`Starting email fetch for user ${userId}:`, {
      maxResults, 
      labelIds, 
      query: q, 
      fetchAll, 
      finalPass
    });
    
    // Number of pages we'll attempt to fetch when fetchAll is true
    // This is a safety limit to prevent infinite loops
    const MAX_PAGES = finalPass ? 1000 : 500; // Much higher limits to get ALL emails
    
    // Paginate through results to fetch larger numbers of emails
    do {
      totalPages++;
      
      // If we're not on finalPass, limit the number of pages we'll fetch
      // to avoid overwhelming the system
      if (!finalPass && totalPages > MAX_PAGES) {
        console.log(`Reached max page limit (${MAX_PAGES}) for non-final pass`);
        break;
      }
      
      // Log progress for long-running fetches
      if (totalPages % 5 === 0) {
        console.log(`Fetching page ${totalPages}, total messages so far: ${totalFetchedCount + messages.length}`);
      }
      
      // Use the highest possible value for maxResults to get as many emails as possible
      // The API docs say 500 is the max, but we'll still try a higher number to be sure
      const params = {
        userId: 'me',
        maxResults: 1000, // Try with a higher value than 500 to see if we can get more per request
        includeSpamTrash: true // Include even spam and trash to get EVERYTHING
      };
      
      // Only add query parameter if we're not dealing with metadata-only access
      // This prevents "Metadata scope does not support 'q' parameter" errors
      try {
        const client = await getGmailClient(userId);
        // Try a simple call to see if we have full access
        const testCall = await client.users.labels.list({ userId: 'me' });
        // If we get here without error, it's likely safe to use query parameters
        if (q && q.length > 0) {
          params.q = q;
        }
      } catch (scopeError) {
        console.log("Skipping query parameter due to possible scope limitations");
      }
      
      // More extensive logging on first page to help diagnose permission-related issues
      if (totalPages === 1) {
        console.log(`First page fetch with params:`, params);
        console.log(`Using API scopes: ${process.env.GOOGLE_API_SCOPES || 'Not explicitly defined in env'}`);
      }
      
      // Only add labelIds if provided (allows for fetching all emails) and we have proper permissions
      // We'll reuse the permission check logic from above
      let hasFullAccess = false;
      
      try {
        // We already checked above, but this variable wasn't in scope
        if (q && q.length > 0 && params.q) {
          hasFullAccess = true;
        }
      } catch (e) {
        // Ignore errors, we'll just assume limited access
      }
      
      // Only add labelIds if we have full access or if it's INBOX, SPAM, etc. (basic labels work with metadata access)
      if (labelIds && labelIds.length > 0) {
        const safeLabels = ['INBOX', 'SPAM', 'TRASH', 'UNREAD', 'SENT'];
        const allLabelsAreSafe = labelIds.every(label => safeLabels.includes(label));
        
        if (hasFullAccess || allLabelsAreSafe) {
          params.labelIds = labelIds;
        } else {
          console.log("Not using custom label filters due to possible scope limitations");
        }
      }
      
      // Add page token for subsequent requests
      if (nextPageToken) {
        params.pageToken = nextPageToken;
      }
      
      // Get list of messages - handle metadata scope errors
      let response;
      try {
        response = await gmail.users.messages.list(params);
      } catch (listError) {
        // If we hit a metadata scope limitation, try a more basic approach
        if (listError && 
            ((listError.errors && listError.errors.some(e => e.message && e.message.includes("Metadata scope"))) ||
             (listError.message && listError.message.includes("Metadata scope")))
           ) {
          console.log("Hit metadata scope limitation, trying more basic parameters");
          
          // Create a simpler params object without potentially problematic fields
          const basicParams = {
            userId: 'me',
            maxResults: 500 // Use a more conservative number
          };
          
          // Only add very basic filters that work with metadata scope
          if (labelIds && labelIds.includes('INBOX')) {
            basicParams.labelIds = ['INBOX'];
          }
          
          // Try the more basic request
          response = await gmail.users.messages.list(basicParams);
        } else {
          // If it's some other error, rethrow
          throw listError;
        }
      }
      
      // No messages in this batch
      if (!response.data.messages || response.data.messages.length === 0) {
        break;
      }
      
      const batchSize = response.data.messages.length;
      console.log(`Fetched page ${totalPages} with ${batchSize} messages`);
      
      // We only want to add this page's messages to our collection
      // No need to process the previous batch since we're doing it in batches
      messages = response.data.messages;
      
      // Store next page token for next iteration
      nextPageToken = response.data.nextPageToken;
      
      // If we've reached our desired max count and we're not fetching all,
      // stop fetching more pages
      if (!fetchAll && totalFetchedCount + messages.length >= maxResults) {
        messages = messages.slice(0, maxResults - totalFetchedCount);
        break;
      }
      
      // Small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } while (nextPageToken && (fetchAll || totalFetchedCount + messages.length < maxResults));
    
    // Process any remaining messages
    if (messages.length > 0) {
      console.log(`Processing final batch of ${messages.length} messages`);
      const processedInFinalBatch = await processMessages(userId, gmail, messages);
      totalFetchedCount += processedInFinalBatch;
    }
    
    console.log(`Completed email fetch for user ${userId}: processed ${totalFetchedCount} emails from ${totalPages} pages`);
    
    return { 
      success: true, 
      message: `Successfully processed ${totalFetchedCount} emails`,
      count: totalFetchedCount
    };
  } catch (error) {
    console.error('Error fetching emails:', error);
    
    // Special handling for metadata scope errors
    if (error && error.errors && error.errors.length > 0) {
      // Check for specific metadata scope error
      const metadataScopeError = error.errors.find(err => 
        err.message && (
          err.message.includes("Metadata scope does not support") ||
          err.message.includes("Metadata scope doesn't allow")
        )
      );
      
      if (metadataScopeError) {
        console.log("Received metadata scope limitation error:", metadataScopeError.message);
        return { 
          success: false, 
          error: `Limited Gmail access: Please disconnect and reconnect your Gmail account in Settings to grant full permissions.`,
          scopeError: true,
          details: metadataScopeError.message
        };
      }
    }
    
    // Handle case where error.message exists
    if (error.message && (
      error.message.includes("Metadata scope does not support") ||
      error.message.includes("Metadata scope doesn't allow")
    )) {
      console.log("Received metadata scope limitation error:", error.message);
      return { 
        success: false, 
        error: `Limited Gmail access: Please disconnect and reconnect your Gmail account in Settings to grant full permissions.`,
        scopeError: true,
        details: error.message
      };
    }
    
    return { success: false, error: `Failed to fetch emails: ${error.message || 'Unknown error'}` };
  }
}

/**
 * Get existing email IDs from database
 * @param {string} userId User ID
 * @param {Array} messages List of Gmail message objects
 * @returns {Promise<Set>} Set of existing email IDs
 */
async function getExistingEmailIds(userId, messages) {
  // Break message ID check into smaller chunks if there are many messages
  const MAX_IDS_PER_QUERY = 1000; // MongoDB has limits on query size
  let existingEmailIds = new Set();
  
  for (let i = 0; i < messages.length; i += MAX_IDS_PER_QUERY) {
    const idBatch = messages.slice(i, i + MAX_IDS_PER_QUERY).map(m => m.id);
    
    const existingEmailsBatch = await Email.find({ 
      userId, 
      emailProviderId: { $in: idBatch } 
    }).select('emailProviderId');
    
    // Add to our master set
    existingEmailsBatch.forEach(email => {
      existingEmailIds.add(email.emailProviderId);
    });
  }
  
  return existingEmailIds;
}

/**
 * Process Gmail messages for a user
 * @param {string} userId User ID
 * @param {Object} gmail Gmail API client
 * @param {Array} messages List of Gmail message objects
 * @returns {Promise<number>} Count of processed messages
 */
async function processMessages(userId, gmail, messages) {
  let processedCount = 0;
  
  // Adaptive batch size - smaller batches for larger total sizes to prevent timeouts
  const totalMessages = messages.length;
  let BATCH_SIZE = 25; // Default
  
  // Dynamic batch sizing based on total volume
  if (totalMessages > 1000) {
    BATCH_SIZE = 15;
  } else if (totalMessages > 500) {
    BATCH_SIZE = 20;
  } else if (totalMessages <= 50) {
    BATCH_SIZE = 30; // For small batches, process more at once
  }
  
  console.log(`Processing ${totalMessages} messages in batches of ${BATCH_SIZE}`);
  
  // First, check which emails we already have to avoid fetching them
  try {
    // Use our helper function to get existing email IDs
    const existingEmailIds = await getExistingEmailIds(userId, messages);
    
    // Filter out messages we already have
    const newMessages = messages.filter(m => !existingEmailIds.has(m.id));
    
    console.log(`Found ${existingEmailIds.size} existing emails, processing ${newMessages.length} new emails`);
    
    // Process in batches
    for (let i = 0; i < newMessages.length; i += BATCH_SIZE) {
      const batch = newMessages.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(newMessages.length / BATCH_SIZE);
      
      if (batchNumber % 5 === 0 || batchNumber === 1 || batchNumber === totalBatches) {
        console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);
      }
      
      // Process this batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(message => processMessage(userId, gmail, message))
      );
      
      // Count successful processes
      const successfulInBatch = batchResults.filter(r => r.status === 'fulfilled' && r.value).length;
      processedCount += successfulInBatch;
      
      // Report progress periodically
      if (batchNumber % 5 === 0 || batchNumber === 1 || batchNumber === totalBatches) {
        console.log(`Batch ${batchNumber} complete: ${successfulInBatch}/${batch.length} emails processed successfully (${processedCount} total so far)`);
      }
      
      // Short delay between batches to avoid overloading, longer for larger batches
      if (i + BATCH_SIZE < newMessages.length) {
        const delayTime = totalBatches > 100 ? 200 : 500;
        await new Promise(resolve => setTimeout(resolve, delayTime));
      }
    }
  } catch (error) {
    console.error('Error during message processing:', error);
    // Try to continue with a simplified approach if the bulk method fails
    console.log('Falling back to individual message processing');
    
    try {
      for (let i = 0; i < messages.length; i++) {
        try {
          // Check if we already have this email using our tracking set
          const emailExists = existingEmailIds.has(messages[i].id);
          
          if (!emailExists) {
            const success = await processMessage(userId, gmail, messages[i]);
            if (success) {
              processedCount++;
              // Add to our tracking set
              existingEmailIds.add(messages[i].id);
            }
          }
          
          // Log progress every 20 emails
          if (i % 20 === 0) {
            console.log(`Processed ${i+1}/${messages.length} emails (fallback mode)`);
          }
        } catch (msgError) {
          console.error(`Error processing message ${i+1}/${messages.length}:`, msgError);
          // Continue with next message despite error
        }
      }
    } catch (fallbackError) {
      console.error('Error during fallback processing:', fallbackError);
    }
  }
  
  return processedCount;
}

/**
 * Process a single Gmail message
 * @param {string} userId User ID
 * @param {Object} gmail Gmail API client
 * @param {Object} message Gmail message object
 * @returns {Promise<boolean>} Success status
 */
async function processMessage(userId, gmail, message) {
  try {
    // Try to get full message details, but fall back to metadata if permissions are insufficient
    let response;
    try {
      response = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });
    } catch (error) {
      if (error.message && error.message.includes("Metadata scope doesn't allow format FULL")) {
        console.log(`Permission issue for message ${message.id}, falling back to metadata format`);
        
        // Try with metadata format instead
        response = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });
      } else {
        // If it's some other error, rethrow it
        throw error;
      }
    }
    
    // Parse the email
    const emailData = parseEmailMessage(response.data);
    
    // Log debug info for the first few emails to help diagnose issues
    if (Math.random() < 0.05) { // Log roughly 5% of emails for debugging
      console.log(`Email parsing stats for ${message.id}:
        - Format: ${response.data.format || 'unknown'}
        - Has payload: ${!!response.data.payload}
        - Has body text: ${!!emailData.body.text}
        - Body text length: ${emailData.body.text ? emailData.body.text.length : 0}
        - Is metadata only: ${!!(emailData.metadata && emailData.metadata.isMetadataOnly)}
        - Subject: ${emailData.subject}
      `);
    }
    
    // Prepare email data for upsert
    const emailToUpsert = {
      userId,
      ...emailData,
      categories: [] // Will be filled by categorizer
    };
    
    // Categorize the email
    const categoryIds = await categorizer.categorizeEmail(userId, emailToUpsert);
    emailToUpsert.categories = categoryIds;
    
    // Use findOneAndUpdate with upsert to avoid race conditions and duplicates
    // The unique index will prevent duplicates, and upsert will update if exists or insert if not
    await Email.findOneAndUpdate(
      { userId, emailProviderId: emailData.emailProviderId },
      emailToUpsert,
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    return true;
    
  } catch (error) {
    // If error is a duplicate key error (11000), it's not a real error, just means
    // the email was already processed by another concurrent process
    if (error.code === 11000) {
      console.log(`Email ${message.id} already exists, skipping`);
      return true;
    }
    
    console.error(`Error processing message ${message.id}:`, error);
    return false;
  }
}

module.exports = {
  fetchAndProcessEmails
};