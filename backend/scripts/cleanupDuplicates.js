/**
 * Script to clean up duplicate emails in the database
 * 
 * This script:
 * 1. Finds and removes duplicate emails for all users
 * 2. Creates a unique compound index on userId + emailProviderId to prevent future duplicates
 * 
 * Usage:
 * node scripts/cleanupDuplicates.js
 */

// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const Email = require('../src/models/Email');
const User = require('../src/models/User');

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
 * Clean up duplicate emails for all users
 */
async function cleanupDuplicates() {
  try {
    console.log('Starting duplicate cleanup...');
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users`);
    
    let totalDuplicatesRemoved = 0;
    let totalEmailsProcessed = 0;
    
    // Process each user
    for (const user of users) {
      console.log(`\nProcessing user: ${user.email || user._id}`);
      
      // Get initial count for this user
      const initialCount = await Email.countDocuments({ userId: user._id });
      totalEmailsProcessed += initialCount;
      console.log(`User has ${initialCount} emails before cleanup`);
      
      // Find all emails
      const emails = await Email.find({ userId: user._id }).lean();
      
      // Group emails by provider ID
      const emailsByProviderId = {};
      emails.forEach(email => {
        if (!email.emailProviderId) return; // Skip emails without provider ID
        
        if (!emailsByProviderId[email.emailProviderId]) {
          emailsByProviderId[email.emailProviderId] = [];
        }
        emailsByProviderId[email.emailProviderId].push(email);
      });
      
      // Find duplicate provider IDs
      const duplicateProviderIds = Object.keys(emailsByProviderId)
        .filter(providerId => emailsByProviderId[providerId].length > 1);
      
      console.log(`Found ${duplicateProviderIds.length} duplicate provider IDs for user`);
      
      // Track emails to remove
      const emailIdsToRemove = [];
      
      // Process each duplicate set
      for (const providerId of duplicateProviderIds) {
        const duplicates = emailsByProviderId[providerId];
        
        // Sort by objectId to keep the oldest one
        duplicates.sort((a, b) => a._id.localeCompare(b._id));
        
        // Keep the first one, mark the rest for removal
        for (let i = 1; i < duplicates.length; i++) {
          emailIdsToRemove.push(duplicates[i]._id);
        }
      }
      
      // Remove duplicates if any found
      if (emailIdsToRemove.length > 0) {
        const deleteResult = await Email.deleteMany({ _id: { $in: emailIdsToRemove } });
        console.log(`Removed ${deleteResult.deletedCount} duplicate emails for user`);
        totalDuplicatesRemoved += deleteResult.deletedCount;
      }
      
      // Get final count
      const finalCount = await Email.countDocuments({ userId: user._id });
      console.log(`User now has ${finalCount} emails after cleanup (removed ${initialCount - finalCount})`);
    }
    
    console.log('\n========== Cleanup Summary ==========');
    console.log(`Total emails processed: ${totalEmailsProcessed}`);
    console.log(`Total duplicates removed: ${totalDuplicatesRemoved}`);
    console.log(`Duplicate percentage: ${(totalDuplicatesRemoved / totalEmailsProcessed * 100).toFixed(2)}%`);
    
    // Ensure there's a unique compound index to prevent future duplicates
    console.log('\nEnsuring unique index on userId + emailProviderId...');
    await ensureUniqueIndex();
    
    console.log('\nCleanup complete!');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

/**
 * Ensure there's a unique compound index on userId + emailProviderId
 */
async function ensureUniqueIndex() {
  try {
    // Get collection
    const emailCollection = mongoose.connection.db.collection('emails');
    
    // Get existing indexes
    const indexes = await emailCollection.indexes();
    
    // Check if our index already exists
    const hasUniqueIndex = indexes.some(index => 
      index.key && index.key.userId === 1 && index.key.emailProviderId === 1 && index.unique === true
    );
    
    if (hasUniqueIndex) {
      console.log('Unique index already exists');
    } else {
      // Create the index
      await emailCollection.createIndex(
        { userId: 1, emailProviderId: 1 },
        { unique: true, background: true }
      );
      console.log('Created unique compound index on userId + emailProviderId');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring unique index:', error);
    return false;
  }
}

// Run the cleanup
cleanupDuplicates();