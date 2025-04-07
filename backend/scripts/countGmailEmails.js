/**
 * Script to count total emails in Gmail
 * 
 * This script:
 * 1. Connects to Gmail API
 * 2. Gets total count of emails using various approaches
 * 
 * Usage:
 * node scripts/countGmailEmails.js
 */

require('dotenv').config();

const { google } = require('googleapis');
const User = require('../src/models/User');
const mongoose = require('mongoose');
const gmailClient = require('../src/services/gmail/client');
const Email = require('../src/models/Email');

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gmail-categorizer', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

/**
 * Count emails in Gmail
 */
async function countGmailEmails() {
  try {
    console.log('Starting Gmail email count...');
    
    // Get the first user with Gmail tokens
    const user = await User.findOne({ googleTokens: { $exists: true, $ne: null } });
    
    if (!user) {
      console.log('No users with Gmail integration found');
      return;
    }
    
    console.log(`Using user: ${user.email || user._id}`);
    
    // Get Gmail client
    const gmail = await gmailClient.getGmailClient(user._id);
    
    if (!gmail) {
      console.log('Could not create Gmail client');
      return;
    }
    
    // Count emails in the database
    const dbCount = await Email.countDocuments({ userId: user._id });
    console.log(`Database contains ${dbCount} emails for this user`);
    
    // Get list of all labels
    const labels = await gmail.users.labels.list({ userId: 'me' });
    console.log('\nAvailable labels:');
    
    for (const label of labels.data.labels) {
      console.log(`- ${label.name} (${label.id}): ${label.messagesTotal} messages, ${label.messagesUnread} unread`);
    }
    
    // Find the "ALL_MAIL" equivalent label - usually it's called "All Mail" (GMAIL)
    let allMailLabel = labels.data.labels.find(l => l.name === 'All Mail');
    if (allMailLabel) {
      console.log(`\nFound All Mail label with ID ${allMailLabel.id}`);
      console.log(`All Mail contains ${allMailLabel.messagesTotal} total messages`);
    } else {
      console.log('\nCould not find an "All Mail" label');
    }
    
    // Try querying with various approaches
    console.log('\nTrying different query approaches:');
    
    // Approach 1: Empty query
    try {
      const response1 = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1
      });
      
      console.log(`Approach 1 (Empty query): ${response1.data.resultSizeEstimate} estimated results`);
    } catch (error) {
      console.error('Error with approach 1:', error.message);
    }
    
    // Approach 2: in:anywhere query
    try {
      const response2 = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1,
        q: 'in:anywhere'
      });
      
      console.log(`Approach 2 (in:anywhere): ${response2.data.resultSizeEstimate} estimated results`);
    } catch (error) {
      console.error('Error with approach 2:', error.message);
    }
    
    // Approach 3: in:all query
    try {
      const response3 = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1,
        q: 'in:all'
      });
      
      console.log(`Approach 3 (in:all): ${response3.data.resultSizeEstimate} estimated results`);
    } catch (error) {
      console.error('Error with approach 3:', error.message);
    }
    
    // Approach 4: is:all query
    try {
      const response4 = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1,
        q: 'is:all'
      });
      
      console.log(`Approach 4 (is:all): ${response4.data.resultSizeEstimate} estimated results`);
    } catch (error) {
      console.error('Error with approach 4:', error.message);
    }
    
    // Count emails with specific dates
    console.log('\nCounting emails by date ranges:');
    
    const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    
    for (const year of years) {
      try {
        const response = await gmail.users.messages.list({
          userId: 'me',
          maxResults: 1,
          q: `after:${year}/01/01 before:${year}/12/31`
        });
        
        console.log(`Year ${year}: ${response.data.resultSizeEstimate} estimated emails`);
      } catch (error) {
        console.error(`Error counting emails for year ${year}:`, error.message);
      }
    }
    
    console.log('\nCounting total emails by using Gmail ID range:');
    
    // List all emails to find ID ranges
    const allMessages = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 1000 // Get a batch to analyze
    });
    
    if (allMessages.data.messages && allMessages.data.messages.length > 0) {
      // Sort by ID
      const sortedIds = allMessages.data.messages.map(m => m.id).sort();
      
      console.log(`First ID: ${sortedIds[0]}`);
      console.log(`Last ID: ${sortedIds[sortedIds.length-1]}`);
      
      // Print a few IDs to understand the format
      console.log('Sample IDs:', sortedIds.slice(0, 5));
      
      // Count in database by ID to see where the mismatch is
      const firstIds = await Email.find({ userId: user._id })
        .sort({ emailProviderId: 1 })
        .limit(5)
        .select('emailProviderId');
      
      const lastIds = await Email.find({ userId: user._id })
        .sort({ emailProviderId: -1 })
        .limit(5)
        .select('emailProviderId');
      
      console.log('\nIDs in database:');
      console.log('First IDs in DB:', firstIds.map(e => e.emailProviderId));
      console.log('Last IDs in DB:', lastIds.map(e => e.emailProviderId));
    }
    
    console.log('\nCount complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run the count
countGmailEmails()
  .catch(console.error);