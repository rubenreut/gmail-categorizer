const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Email = require('../models/Email');
const Filter = require('../models/Filter');
const categorizer = require('../ai/categorizer');

/**
 * @route   GET /api/emails
 * @desc    Get emails for the user with pagination and filters
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    // Check if it's the demo user
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        data: [
          {
            _id: 'email1',
            from: { name: 'GitHub', email: 'noreply@github.com' },
            subject: 'New pull request in gmail-categorizer',
            body: { text: 'Feature: Added AI categorization for new emails' },
            receivedAt: new Date(),
            isRead: false,
            metadata: { hasAttachments: false },
            categories: ['cat4'] // Updates
          },
          {
            _id: 'email2',
            from: { name: 'Jane Smith', email: 'jane.smith@company.com' },
            subject: 'Project timeline update',
            body: { text: 'Hi, I\'ve updated the project timeline with the new milestones we discussed yesterday.' },
            receivedAt: new Date(),
            isRead: false,
            metadata: { hasAttachments: true },
            categories: ['cat5'] // Work
          },
          {
            _id: 'email3',
            from: { name: 'LinkedIn', email: 'no-reply@linkedin.com' },
            subject: 'New connection request',
            body: { text: 'John Doe wants to connect with you on LinkedIn' },
            receivedAt: new Date(Date.now() - 86400000), // yesterday
            isRead: true,
            metadata: { hasAttachments: false },
            categories: ['cat2'] // Social
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          totalPages: 1
        }
      });
    }

    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query
    const query = { userId: req.user.id };
    
    // Add category filter if provided
    if (req.query.category) {
      query.categories = req.query.category;
    }
    
    // Add read/unread filter if provided
    if (req.query.isRead) {
      query.isRead = req.query.isRead === 'true';
    }
    
    // Get emails with pagination
    const [emails, total] = await Promise.all([
      Email.find(query)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit),
      Email.countDocuments(query)
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: emails,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/emails/:id
 * @desc    Get email by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const email = await Email.findOne({ 
      _id: req.params.id,
      userId: req.user.id 
    });
    
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }
    
    res.json({
      success: true,
      data: email
    });
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PATCH /api/emails/:id
 * @desc    Update email properties (read status, categories)
 * @access  Private
 */
router.patch('/:id', auth, async (req, res) => {
  try {
    const email = await Email.findOne({ 
      _id: req.params.id,
      userId: req.user.id 
    });
    
    if (!email) {
      return res.status(404).json({ success: false, error: 'Email not found' });
    }
    
    // Update read status
    if (req.body.isRead !== undefined) {
      email.isRead = req.body.isRead;
    }
    
    // Add categories
    if (req.body.addCategories) {
      req.body.addCategories.forEach(categoryId => {
        if (!email.categories.includes(categoryId)) {
          email.categories.push(categoryId);
        }
      });
    }
    
    // Remove categories
    if (req.body.removeCategories) {
      email.categories = email.categories.filter(
        categoryId => !req.body.removeCategories.includes(categoryId)
      );
    }
    
    await email.save();
    
    res.json({
      success: true,
      data: email
    });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/emails/fetch
 * @desc    Fetch new emails from Gmail API and categorize them
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
    
    // Check if this is a full sync request (historical emails)
    const fullSync = req.query.fullSync === 'true' || req.body.fullSync === true;
    
    // Start fetch process asynchronously - we'll return immediately
    // to the client while processing continues in the background
    res.json({
      success: true,
      message: fullSync ? 'Full email sync initiated' : 'Email fetch initiated'
    });
    
    // This happens after response is sent
    setTimeout(async () => {
      try {
        const syncService = require('../services/syncService');
        const user = await require('../models/User').findById(req.user.id);
        
        if (user) {
          const result = await syncService.syncUserEmails(user, fullSync);
          console.log('Email fetch completed:', result);
          
          // Here you could implement a notification system to alert the user
          // when fetch is complete
        } else {
          console.error('User not found for email fetch');
        }
      } catch (fetchError) {
        console.error('Background email fetch error:', fetchError);
      }
    }, 100);
    
  } catch (error) {
    console.error('Fetch emails error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/emails/sync-status
 * @desc    Get email sync status
 * @access  Private
 */
router.get('/sync-status', auth, async (req, res) => {
  try {
    // For demo user, just return success
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        data: {
          lastSync: new Date(),
          emailCount: 3,
          isComplete: true
        }
      });
    }
    
    const user = await require('../models/User').findById(req.user.id);
    const emailCount = await require('../models/Email').countDocuments({ userId: req.user.id });
    
    res.json({
      success: true,
      data: {
        lastSync: user.lastEmailSync || null,
        emailCount,
        isComplete: !!user.lastEmailSync
      }
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/emails/count
 * @desc    Get total email count for a user
 * @access  Private
 */
router.get('/count', auth, async (req, res) => {
  try {
    // For demo user, just return a fixed count
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        count: 3
      });
    }
    
    const count = await require('../models/Email').countDocuments({ userId: req.user.id });
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get email count error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/emails/sync
 * @desc    Trigger a full sync from Gmail and replace all local emails
 * @access  Private
 */
router.post('/sync', auth, async (req, res) => {
  try {
    // For demo user, just return success
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        message: 'Sync triggered for demo user (simulation)'
      });
    }
    
    // Respond immediately to client
    res.json({
      success: true,
      message: 'Full synchronization triggered - replacing all emails from Gmail'
    });
    
    // Continue processing in the background
    setTimeout(async () => {
      try {
        // First, clear all existing emails for this user
        console.log(`Clearing existing emails for user ${req.user.id}`);
        const Email = require('../models/Email');
        await Email.deleteMany({ userId: req.user.id });
        
        // Then, perform a full sync to get all emails from Gmail
        const syncService = require('../services/syncService');
        const user = await require('../models/User').findById(req.user.id);
        
        if (user) {
          // Force a clean slate for synchronization
          user.lastEmailSync = null; // Reset last sync time to force full historical sync
          await user.save();
          
          // Add a special forced flag for complete sync
          console.log(`Starting COMPLETE full sync for user ${user.email}`);
          await syncService.syncUserEmails(user, true, true); // true = full sync, true = forced complete sync
          console.log('Full synchronization completed for user', user.email);
          
          // Update sync time
          user.lastEmailSync = new Date();
          await user.save();
          
          // Count the emails
          const emailCount = await Email.countDocuments({ userId: user._id });
          console.log(`Sync complete. User now has ${emailCount} emails in database.`);
        } else {
          console.error('User not found for email sync');
        }
      } catch (syncError) {
        console.error('Background sync error:', syncError);
      }
    }, 100);
    
  } catch (error) {
    console.error('Sync trigger error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/emails/cleanup-duplicates
 * @desc    Remove duplicate emails for a user
 * @access  Private
 */
router.post('/cleanup-duplicates', auth, async (req, res) => {
  try {
    // For demo user, just return success
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        message: 'No duplicates to clean up for demo user',
        removedCount: 0,
        initialCount: 3,
        finalCount: 3
      });
    }
    
    const Email = require('../models/Email');
    
    // Get initial count
    const initialCount = await Email.countDocuments({ userId: req.user.id });
    
    // Create a unique compound index to prevent future duplicates if it doesn't exist
    try {
      const emailCollection = mongoose.connection.db.collection('emails');
      const indexes = await emailCollection.indexes();
      
      // Check if our index already exists
      const hasUniqueIndex = indexes.some(index => 
        index.key && index.key.userId === 1 && index.key.emailProviderId === 1 && index.unique === true
      );
      
      if (!hasUniqueIndex) {
        // Create the index
        await emailCollection.createIndex(
          { userId: 1, emailProviderId: 1 },
          { unique: true, background: true }
        );
        console.log('Created unique compound index on userId + emailProviderId');
      }
    } catch (indexError) {
      console.error('Error ensuring unique index:', indexError);
      // Continue with cleanup even if index creation fails
    }
    
    // Use MongoDB aggregation for more efficient duplicate detection
    console.log(`Finding duplicates for user ${req.user.id} using aggregation...`);
    
    // Find duplicate emails using aggregation pipeline
    const duplicateGroups = await Email.aggregate([
      // Match only this user's emails
      { $match: { userId: mongoose.Types.ObjectId(req.user.id) } },
      
      // Group by emailProviderId and collect all document IDs
      { $group: {
          _id: "$emailProviderId",
          docs: { $push: "$_id" },
          count: { $sum: 1 }
        }
      },
      
      // Filter to only groups with more than one document
      { $match: { count: { $gt: 1 } } }
    ]);
    
    console.log(`Found ${duplicateGroups.length} duplicate groups for user ${req.user.id}`);
    
    let totalRemoved = 0;
    
    // Process each duplicate group in batches to avoid memory issues
    const BATCH_SIZE = 100; // Process groups in batches of 100
    
    for (let i = 0; i < duplicateGroups.length; i += BATCH_SIZE) {
      const batch = duplicateGroups.slice(i, i + BATCH_SIZE);
      
      // Process this batch
      for (const group of batch) {
        // Sort ObjectIds to keep the oldest one (lowest ObjectId)
        group.docs.sort((a, b) => a.toString().localeCompare(b.toString()));
        
        // Keep the first one, remove the rest
        const docsToRemove = group.docs.slice(1);
        
        // Remove duplicates for this email
        if (docsToRemove.length > 0) {
          try {
            const deleteResult = await Email.deleteMany({ 
              _id: { $in: docsToRemove } 
            });
            
            totalRemoved += deleteResult.deletedCount;
          } catch (error) {
            console.error(`Error removing duplicates for group ${group._id}:`, error);
          }
        }
      }
      
      // Log progress
      if (duplicateGroups.length > BATCH_SIZE) {
        const progress = Math.min(i + BATCH_SIZE, duplicateGroups.length);
        console.log(`Processed ${progress}/${duplicateGroups.length} groups (${(progress/duplicateGroups.length*100).toFixed(1)}%)`);
      }
    }
    
    console.log(`Removed ${totalRemoved} duplicate emails for user ${req.user.id}`);
    
    // Get final count
    const finalCount = await Email.countDocuments({ userId: req.user.id });
    
    res.json({
      success: true,
      message: `Removed ${totalRemoved} duplicate emails`,
      initialCount,
      finalCount,
      removedCount: totalRemoved
    });
  } catch (error) {
    console.error('Cleanup duplicates error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;