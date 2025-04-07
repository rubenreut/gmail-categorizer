/**
 * Final Email Duplicate Cleanup Script
 * 
 * This script does a brute-force approach to clean ALL duplicate emails:
 * 1. Creates a temporary collection to store cleaned emails
 * 2. Selects one email per unique (userId, emailProviderId) pair
 * 3. Copies those to the temporary collection
 * 4. Drops the original collection and renames the temp collection
 * 
 * Usage:
 * node scripts/finalCleanup.js
 */

// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Database connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gmail-categorizer';

async function finalCleanup() {
  console.log('Starting FINAL email cleanup process...');
  console.log(`Connecting to database: ${MONGODB_URI}`);
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Step 1: Check the current number of emails
    const emailCollection = db.collection('emails');
    const totalEmails = await emailCollection.countDocuments();
    console.log(`Total emails in database before cleanup: ${totalEmails}`);
    
    // Step 2: Create a temporary collection to hold deduplicated emails
    const tempCollectionName = 'emails_temp_' + Date.now();
    console.log(`Creating temporary collection: ${tempCollectionName}`);
    
    // Step 3: Use aggregation to get only one email per userId + emailProviderId
    console.log('Running aggregation to select one email per unique ID...');
    
    const cursor = emailCollection.aggregate([
      // Sort by _id to ensure we keep the oldest email for each duplicate group
      { $sort: { _id: 1 } },
      
      // Group by userId + emailProviderId and keep the first document
      { $group: {
          _id: { 
            userId: "$userId", 
            emailProviderId: "$emailProviderId" 
          },
          doc: { $first: "$$ROOT" }
        }
      },
      
      // Reformat to get the original document structure
      { $replaceRoot: { newRoot: "$doc" } }
    ]);
    
    // Step 4: Create new collection with deduplicated emails
    const tempCollection = db.collection(tempCollectionName);
    
    // Process in batches to avoid memory issues
    const BATCH_SIZE = 1000;
    let batch = [];
    let totalProcessed = 0;
    
    console.log('Copying deduplicated emails to temporary collection...');
    
    // Process cursor in batches
    for await (const doc of cursor) {
      batch.push(doc);
      
      if (batch.length >= BATCH_SIZE) {
        await tempCollection.insertMany(batch);
        totalProcessed += batch.length;
        console.log(`Processed ${totalProcessed} emails`);
        batch = [];
      }
    }
    
    // Insert any remaining docs
    if (batch.length > 0) {
      await tempCollection.insertMany(batch);
      totalProcessed += batch.length;
      console.log(`Processed ${totalProcessed} emails`);
    }
    
    // Step 5: Create the compound unique index on the new collection
    console.log('Creating unique index on temporary collection...');
    await tempCollection.createIndex(
      { userId: 1, emailProviderId: 1 },
      { unique: true, background: true }
    );
    
    // Step 6: Verify counts
    const deduplicatedCount = await tempCollection.countDocuments();
    console.log(`\n=== Cleanup Summary ===`);
    console.log(`Original emails: ${totalEmails}`);
    console.log(`Deduplicated emails: ${deduplicatedCount}`);
    console.log(`Duplicates removed: ${totalEmails - deduplicatedCount}`);
    console.log(`Duplicate percentage: ${((totalEmails - deduplicatedCount) / totalEmails * 100).toFixed(2)}%`);
    
    // Step 7: Replace the original collection with the deduplicated one
    if (deduplicatedCount > 0 && deduplicatedCount < totalEmails) {
      console.log('\nReplacing original collection with deduplicated collection...');
      
      // Need to use 'admin' db for rename across collections
      const adminDb = client.db().admin();
      
      // Backup the original collection first (just in case)
      const backupName = 'emails_backup_' + Date.now();
      console.log(`Backing up original collection to: ${backupName}`);
      
      // Rename emails to backup
      await db.collection('emails').rename(backupName);
      
      // Rename temp to emails
      await db.collection(tempCollectionName).rename('emails');
      
      console.log('Collection replacement completed successfully!');
      console.log(`Original collection backed up as: ${backupName}`);
      console.log(`You can drop the backup collection when you're confident everything is working correctly.`);
    } else if (deduplicatedCount === totalEmails) {
      console.log('\nNo duplicates found. No collection replacement needed.');
      
      // Drop the temporary collection
      await db.collection(tempCollectionName).drop();
    } else {
      console.log('\nERROR: Deduplicated count is 0 or greater than original count. Something went wrong.');
      console.log('No collection replacement performed for safety.');
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
finalCleanup()
  .catch(console.error);