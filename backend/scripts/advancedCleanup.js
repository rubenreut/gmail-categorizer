/**
 * Advanced Email Duplicate Cleanup Script
 * 
 * This script does a more comprehensive cleanup of duplicate emails by:
 * 1. Using MongoDB aggregation to find and remove duplicates
 * 2. Creating indexes to prevent future duplicates
 * 3. Providing detailed statistics about the cleanup
 * 
 * Usage:
 * node scripts/advancedCleanup.js
 */

// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Database connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gmail-categorizer';

// Connect to MongoDB directly using MongoClient for more advanced operations
async function runCleanup() {
  console.log('Starting advanced email cleanup process...');
  console.log(`Connecting to database: ${MONGODB_URI}`);
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const emailCollection = db.collection('emails');
    const userCollection = db.collection('users');
    
    // Step 1: Get statistics before cleanup
    console.log('\n=== Pre-cleanup Statistics ===');
    const totalEmailsBeforeCleanup = await emailCollection.countDocuments();
    console.log(`Total emails in database: ${totalEmailsBeforeCleanup}`);
    
    // Get number of users
    const users = await userCollection.find({}).toArray();
    console.log(`Total users: ${users.length}`);
    
    // Step 2: Get emails per user
    console.log('\n=== User Email Statistics ===');
    for (const user of users) {
      const userEmails = await emailCollection.countDocuments({ userId: user._id });
      console.log(`User ${user.email || user._id}: ${userEmails} emails`);
    }
    
    // Step 3: Create index on userId + emailProviderId if it doesn't exist
    console.log('\n=== Creating/Verifying Indexes ===');
    const indexes = await emailCollection.indexes();
    
    // Check if our index already exists
    const hasUniqueIndex = indexes.some(index => 
      index.key && 
      index.key.userId === 1 && 
      index.key.emailProviderId === 1 && 
      index.unique === true
    );
    
    if (hasUniqueIndex) {
      console.log('Unique index on userId + emailProviderId already exists');
    } else {
      console.log('Creating unique index on userId + emailProviderId...');
      try {
        await emailCollection.createIndex(
          { userId: 1, emailProviderId: 1 },
          { unique: true, background: true }
        );
        console.log('Index created successfully');
      } catch (error) {
        console.error('Error creating index:', error.message);
        console.log('Will proceed with cleanup to make index creation possible');
      }
    }
    
    // Step 4: Clean up duplicates using an advanced aggregation approach
    console.log('\n=== Identifying Duplicates ===');
    
    // Track total duplicates found and removed
    let totalDuplicatesRemoved = 0;
    
    // Process each user separately to avoid memory issues with large collections
    for (const user of users) {
      console.log(`\nProcessing user ${user.email || user._id}...`);
      
      // Find duplicate emails using aggregation
      const duplicateResults = await emailCollection.aggregate([
        // Match only this user's emails
        { $match: { userId: user._id } },
        
        // Group by emailProviderId and collect all document IDs
        { $group: {
            _id: { 
              userId: "$userId", 
              emailProviderId: "$emailProviderId" 
            },
            docs: { $push: "$_id" },
            count: { $sum: 1 }
          }
        },
        
        // Filter to only groups with more than one document
        { $match: { count: { $gt: 1 } } },
        
        // Sort by count (most duplicates first)
        { $sort: { count: -1 } }
      ]).toArray();
      
      console.log(`Found ${duplicateResults.length} duplicate groups for this user`);
      
      // If no duplicates, continue to next user
      if (duplicateResults.length === 0) {
        continue;
      }
      
      let userDuplicatesRemoved = 0;
      
      // Process each duplicate group
      for (const group of duplicateResults) {
        // Keep the first document (lowest ObjectId) and remove the rest
        // Sort ObjectIds ascending (oldest first)
        group.docs.sort();
        
        // Keep the first one, mark others for deletion
        const docsToRemove = group.docs.slice(1);
        
        // Delete the duplicates
        if (docsToRemove.length > 0) {
          try {
            const deleteResult = await emailCollection.deleteMany({ 
              _id: { $in: docsToRemove } 
            });
            
            userDuplicatesRemoved += deleteResult.deletedCount;
            totalDuplicatesRemoved += deleteResult.deletedCount;
            
            if (group.count > 10) {
              console.log(`  Removed ${deleteResult.deletedCount} duplicates for email with provider ID: ${group._id.emailProviderId}`);
            }
          } catch (error) {
            console.error(`  Error removing duplicates: ${error.message}`);
          }
        }
      }
      
      console.log(`Removed ${userDuplicatesRemoved} duplicate emails for this user`);
      
      // Get updated count for this user
      const userEmailsAfter = await emailCollection.countDocuments({ userId: user._id });
      console.log(`User now has ${userEmailsAfter} emails`);
    }
    
    // Step 5: Get statistics after cleanup
    console.log('\n=== Post-cleanup Statistics ===');
    const totalEmailsAfterCleanup = await emailCollection.countDocuments();
    console.log(`Total emails before: ${totalEmailsBeforeCleanup}`);
    console.log(`Total emails after: ${totalEmailsAfterCleanup}`);
    console.log(`Total duplicates removed: ${totalDuplicatesRemoved}`);
    console.log(`Duplicate percentage: ${(totalDuplicatesRemoved / totalEmailsBeforeCleanup * 100).toFixed(2)}%`);
    
    // Step 6: Try to create the index again if it failed earlier
    if (!hasUniqueIndex) {
      console.log('\n=== Creating Index Again ===');
      try {
        await emailCollection.createIndex(
          { userId: 1, emailProviderId: 1 },
          { unique: true, background: true }
        );
        console.log('Unique index created successfully after cleanup');
      } catch (error) {
        console.error('Error creating index after cleanup:', error.message);
        console.log('There may still be some duplicates in the database');
        
        // Find any remaining duplicates
        const remainingDuplicates = await emailCollection.aggregate([
          { $group: {
              _id: { userId: "$userId", emailProviderId: "$emailProviderId" },
              count: { $sum: 1 }
            }
          },
          { $match: { count: { $gt: 1 } } },
          { $count: "remainingDuplicateGroups" }
        ]).toArray();
        
        if (remainingDuplicates.length > 0) {
          console.log(`Found ${remainingDuplicates[0].remainingDuplicateGroups} remaining duplicate groups`);
        } else {
          console.log('No remaining duplicates found, but index creation still failed');
        }
      }
    }
    
    console.log('\nCleanup process completed!');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the cleanup
runCleanup()
  .catch(console.error);