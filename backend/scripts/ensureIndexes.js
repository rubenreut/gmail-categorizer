/**
 * Script to ensure all required indexes are created
 * 
 * This script:
 * 1. Creates a unique compound index on userId + emailProviderId to prevent duplicates
 * 2. Creates additional indexes for performance
 * 
 * Usage:
 * node scripts/ensureIndexes.js
 */

// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');

// Database connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gmail-categorizer';

async function ensureIndexes() {
  console.log('Starting index setup...');
  console.log(`Connecting to database: ${MONGODB_URI}`);
  
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const emailCollection = db.collection('emails');
    
    // Step 1: Check existing indexes
    console.log('\nChecking existing indexes...');
    const indexes = await emailCollection.indexes();
    console.log(`Found ${indexes.length} existing indexes`);
    
    // Step 2: Create unique compound index if it doesn't exist
    const hasUniqueIndex = indexes.some(index => 
      index.key && 
      index.key.userId === 1 && 
      index.key.emailProviderId === 1 && 
      index.unique === true
    );
    
    if (hasUniqueIndex) {
      console.log('✓ Unique index on userId + emailProviderId already exists');
    } else {
      console.log('Creating unique index on userId + emailProviderId...');
      try {
        await emailCollection.createIndex(
          { userId: 1, emailProviderId: 1 },
          { unique: true, background: true }
        );
        console.log('✓ Created unique index successfully');
      } catch (error) {
        console.error('Error creating unique index:', error.message);
        console.log('Trying to clean up duplicates first to enable index creation...');
        
        // Find duplicates
        const duplicates = await emailCollection.aggregate([
          { $group: {
              _id: { userId: "$userId", emailProviderId: "$emailProviderId" },
              count: { $sum: 1 },
              ids: { $push: "$_id" }
            }
          },
          { $match: { count: { $gt: 1 } } }
        ]).toArray();
        
        console.log(`Found ${duplicates.length} duplicate groups`);
        
        if (duplicates.length > 0) {
          console.log('Removing duplicates...');
          
          let totalRemoved = 0;
          
          for (const group of duplicates) {
            // Keep the first document, remove the rest
            const idsToKeep = group.ids[0];
            const idsToRemove = group.ids.slice(1);
            
            try {
              const result = await emailCollection.deleteMany({
                _id: { $in: idsToRemove }
              });
              
              totalRemoved += result.deletedCount;
            } catch (removeError) {
              console.error(`Error removing duplicates for group: ${group._id}`, removeError);
            }
          }
          
          console.log(`Removed ${totalRemoved} duplicate documents`);
          
          // Try creating the index again
          try {
            await emailCollection.createIndex(
              { userId: 1, emailProviderId: 1 },
              { unique: true, background: true }
            );
            console.log('✓ Created unique index successfully after removing duplicates');
          } catch (retryError) {
            console.error('Still unable to create index after removing duplicates:', retryError);
          }
        }
      }
    }
    
    // Step 3: Create additional performance indexes
    
    // Index for queries by userId (most common query)
    const hasUserIdIndex = indexes.some(index => 
      index.key && 
      Object.keys(index.key).length === 1 && 
      index.key.userId === 1
    );
    
    if (hasUserIdIndex) {
      console.log('✓ Index on userId already exists');
    } else {
      console.log('Creating index on userId...');
      await emailCollection.createIndex(
        { userId: 1 },
        { background: true }
      );
      console.log('✓ Created userId index successfully');
    }
    
    // Index for queries by categories (for category filtering)
    const hasCategoriesIndex = indexes.some(index => 
      index.key && 
      index.key.userId === 1 && 
      index.key.categories === 1
    );
    
    if (hasCategoriesIndex) {
      console.log('✓ Index on userId + categories already exists');
    } else {
      console.log('Creating index on userId + categories...');
      await emailCollection.createIndex(
        { userId: 1, categories: 1 },
        { background: true }
      );
      console.log('✓ Created userId + categories index successfully');
    }
    
    // Index for queries by receivedAt (for sorting by date)
    const hasReceivedAtIndex = indexes.some(index => 
      index.key && 
      index.key.userId === 1 && 
      index.key.receivedAt === -1
    );
    
    if (hasReceivedAtIndex) {
      console.log('✓ Index on userId + receivedAt already exists');
    } else {
      console.log('Creating index on userId + receivedAt...');
      await emailCollection.createIndex(
        { userId: 1, receivedAt: -1 },
        { background: true }
      );
      console.log('✓ Created userId + receivedAt index successfully');
    }
    
    // Step 4: Verify final indexes
    const finalIndexes = await emailCollection.indexes();
    console.log(`\nFinal index count: ${finalIndexes.length}`);
    
    console.log('\nIndex creation complete!');
    
  } catch (error) {
    console.error('Error setting up indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the index creation
ensureIndexes()
  .catch(console.error);