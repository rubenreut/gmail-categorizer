/**
 * Initialize the database with test data
 * Run with: node scripts/initData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Email = require('../src/models/Email');
const Filter = require('../src/models/Filter');
const categoryService = require('../src/services/categoryService');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create a test user
async function createTestUser() {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'demo@example.com' });
    if (existingUser) {
      console.log('Test user already exists');
      return existingUser;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Create user
    const user = new User({
      email: 'demo@example.com',
      password: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      preferences: {
        theme: 'light',
        emailsPerPage: 20,
        categorization: {
          applyAutomatically: true,
          mlSuggestions: true
        },
        notifications: {
          enabled: true,
          emailDigest: false
        }
      }
    });

    await user.save();
    console.log('Test user created:', user.email);
    return user;
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

// Create system categories
async function createCategories(userId) {
  try {
    // Create system categories
    const systemCategories = await categoryService.createSystemCategories(userId);
    console.log(`Created ${systemCategories.length} system categories`);

    // Create custom categories
    const customCategories = [
      {
        userId,
        name: 'Work',
        color: '#0097a7',
        icon: 'work',
        isSystem: false,
        keywords: ['project', 'meeting', 'deadline', 'report', 'office', 'client', 'work']
      },
      {
        userId,
        name: 'Travel',
        color: '#f06292',
        icon: 'flight',
        isSystem: false,
        keywords: ['flight', 'hotel', 'booking', 'reservation', 'trip', 'travel', 'vacation']
      },
      {
        userId,
        name: 'Finance',
        color: '#4caf50',
        icon: 'label',
        isSystem: false,
        keywords: ['invoice', 'payment', 'transaction', 'bill', 'receipt', 'expense', 'bank']
      }
    ];

    const createdCustomCategories = await Category.insertMany(customCategories);
    console.log(`Created ${createdCustomCategories.length} custom categories`);

    // Return all categories
    const allCategories = await Category.find({ userId });
    return allCategories;
  } catch (error) {
    console.error('Error creating categories:', error);
    throw error;
  }
}

// Create filters
async function createFilters(userId, categories) {
  try {
    // Find category IDs by name
    const workCategory = categories.find(c => c.name === 'Work');
    const travelCategory = categories.find(c => c.name === 'Travel');
    const financeCategory = categories.find(c => c.name === 'Finance');
    const socialCategory = categories.find(c => c.name === 'Social');

    // Create filters
    const filters = [
      {
        userId,
        name: 'Work Emails',
        isActive: true,
        conditions: [
          {
            field: 'from',
            operator: 'contains',
            value: 'company.com',
            caseSensitive: false
          },
          {
            field: 'subject',
            operator: 'contains',
            value: 'project',
            caseSensitive: false
          }
        ],
        conditionsMatch: 'any',
        actions: [
          {
            type: 'applyCategory',
            value: workCategory._id
          }
        ]
      },
      {
        userId,
        name: 'Travel Bookings',
        isActive: true,
        conditions: [
          {
            field: 'subject',
            operator: 'contains',
            value: 'flight',
            caseSensitive: false
          },
          {
            field: 'subject',
            operator: 'contains',
            value: 'hotel',
            caseSensitive: false
          },
          {
            field: 'subject',
            operator: 'contains',
            value: 'booking',
            caseSensitive: false
          }
        ],
        conditionsMatch: 'any',
        actions: [
          {
            type: 'applyCategory',
            value: travelCategory._id
          },
          {
            type: 'markAsRead',
            value: ''
          }
        ]
      },
      {
        userId,
        name: 'Social Media',
        isActive: true,
        conditions: [
          {
            field: 'from',
            operator: 'contains',
            value: 'facebook',
            caseSensitive: false
          },
          {
            field: 'from',
            operator: 'contains',
            value: 'twitter',
            caseSensitive: false
          },
          {
            field: 'from',
            operator: 'contains',
            value: 'linkedin',
            caseSensitive: false
          }
        ],
        conditionsMatch: 'any',
        actions: [
          {
            type: 'applyCategory',
            value: socialCategory._id
          }
        ]
      },
      {
        userId,
        name: 'Invoice Handler',
        isActive: true,
        conditions: [
          {
            field: 'subject',
            operator: 'contains',
            value: 'invoice',
            caseSensitive: false
          },
          {
            field: 'subject',
            operator: 'contains',
            value: 'payment',
            caseSensitive: false
          }
        ],
        conditionsMatch: 'any',
        actions: [
          {
            type: 'applyCategory',
            value: financeCategory._id
          },
          {
            type: 'star',
            value: ''
          }
        ]
      }
    ];

    await Filter.insertMany(filters);
    console.log(`Created ${filters.length} filters`);
  } catch (error) {
    console.error('Error creating filters:', error);
    throw error;
  }
}

// Create sample emails
async function createEmails(userId, categories) {
  try {
    // Find categories by name
    const primaryCategory = categories.find(c => c.name === 'Primary');
    const socialCategory = categories.find(c => c.name === 'Social');
    const promotionsCategory = categories.find(c => c.name === 'Promotions');
    const updatesCategory = categories.find(c => c.name === 'Updates');
    const workCategory = categories.find(c => c.name === 'Work');
    const travelCategory = categories.find(c => c.name === 'Travel');

    // Create sample emails
    const emails = [
      {
        userId,
        emailProviderId: 'email1',
        threadId: 'thread1',
        from: {
          name: 'GitHub',
          email: 'noreply@github.com'
        },
        to: [{
          name: 'Demo User',
          email: 'demo@example.com'
        }],
        subject: 'New pull request in gmail-categorizer',
        body: {
          text: 'Feature: Added AI categorization for new emails. Please review the changes and provide feedback.',
          html: '<div>Feature: Added AI categorization for new emails.<br><br>Please review the changes and provide feedback.</div>'
        },
        isRead: false,
        receivedAt: new Date(),
        categories: [updatesCategory._id.toString()],
        metadata: {
          importance: 'high',
          hasAttachments: false
        }
      },
      {
        userId,
        emailProviderId: 'email2',
        threadId: 'thread2',
        from: {
          name: 'Jane Smith',
          email: 'jane.smith@company.com'
        },
        to: [{
          name: 'Demo User',
          email: 'demo@example.com'
        }],
        subject: 'Project timeline update',
        body: {
          text: 'Hi, I\'ve updated the project timeline with the new milestones we discussed yesterday. Please review the attached document and let me know if you have any questions.',
          html: '<div>Hi,<br><br>I\'ve updated the project timeline with the new milestones we discussed yesterday.<br><br>Please review the attached document and let me know if you have any questions.<br><br>Best regards,<br>Jane</div>'
        },
        isRead: false,
        receivedAt: new Date(),
        categories: [workCategory._id.toString(), primaryCategory._id.toString()],
        metadata: {
          importance: 'normal',
          hasAttachments: true
        },
        attachments: [{
          filename: 'project_timeline.pdf',
          contentType: 'application/pdf',
          size: 2456123,
          url: 'https://example.com/files/project_timeline.pdf'
        }]
      },
      {
        userId,
        emailProviderId: 'email3',
        threadId: 'thread3',
        from: {
          name: 'LinkedIn',
          email: 'notifications@linkedin.com'
        },
        to: [{
          name: 'Demo User',
          email: 'demo@example.com'
        }],
        subject: 'John Doe wants to connect on LinkedIn',
        body: {
          text: 'John Doe wants to connect with you on LinkedIn. Accept the invitation to grow your professional network.',
          html: '<div>John Doe wants to connect with you on LinkedIn.<br><br>Accept the invitation to grow your professional network.</div>'
        },
        isRead: true,
        receivedAt: new Date(Date.now() - 86400000), // yesterday
        categories: [socialCategory._id.toString()],
        metadata: {
          importance: 'normal',
          hasAttachments: false
        }
      },
      {
        userId,
        emailProviderId: 'email4',
        threadId: 'thread4',
        from: {
          name: 'Amazon.com',
          email: 'ship-confirm@amazon.com'
        },
        to: [{
          name: 'Demo User',
          email: 'demo@example.com'
        }],
        subject: 'Your Amazon.com order has shipped',
        body: {
          text: 'Your order #123-4567890-1234567 has shipped. Track your package using the link below.',
          html: '<div>Your order #123-4567890-1234567 has shipped.<br><br>Track your package using the link below.</div>'
        },
        isRead: true,
        receivedAt: new Date(Date.now() - 172800000), // 2 days ago
        categories: [updatesCategory._id.toString()],
        metadata: {
          importance: 'normal',
          hasAttachments: false
        }
      },
      {
        userId,
        emailProviderId: 'email5',
        threadId: 'thread5',
        from: {
          name: 'Delta Air Lines',
          email: 'deltaairlines@email.delta.com'
        },
        to: [{
          name: 'Demo User',
          email: 'demo@example.com'
        }],
        subject: 'Your flight confirmation - JFK to SFO',
        body: {
          text: 'Thank you for choosing Delta Air Lines. Your booking is confirmed. Flight details: DL123 JFK-SFO 10:00 AM - 1:15 PM.',
          html: '<div>Thank you for choosing Delta Air Lines. Your booking is confirmed.<br><br>Flight details: DL123 JFK-SFO 10:00 AM - 1:15 PM.</div>'
        },
        isRead: false,
        receivedAt: new Date(Date.now() - 259200000), // 3 days ago
        categories: [travelCategory._id.toString(), primaryCategory._id.toString()],
        metadata: {
          importance: 'high',
          hasAttachments: true
        },
        attachments: [{
          filename: 'boarding_pass.pdf',
          contentType: 'application/pdf',
          size: 1245678,
          url: 'https://example.com/files/boarding_pass.pdf'
        }]
      },
      {
        userId,
        emailProviderId: 'email6',
        threadId: 'thread6',
        from: {
          name: 'Spotify',
          email: 'no-reply@spotify.com'
        },
        to: [{
          name: 'Demo User',
          email: 'demo@example.com'
        }],
        subject: 'Your weekly mix is ready',
        body: {
          text: 'We\'ve updated your Discover Weekly playlist with new songs we think you\'ll like. Listen now.',
          html: '<div>We\'ve updated your Discover Weekly playlist with new songs we think you\'ll like.<br><br>Listen now.</div>'
        },
        isRead: true,
        receivedAt: new Date(Date.now() - 345600000), // 4 days ago
        categories: [promotionsCategory._id.toString()],
        metadata: {
          importance: 'low',
          hasAttachments: false
        }
      }
    ];

    await Email.insertMany(emails);
    console.log(`Created ${emails.length} emails`);
  } catch (error) {
    console.error('Error creating emails:', error);
    throw error;
  }
}

// Main function to initialize data
async function initData() {
  try {
    // Create test user
    const user = await createTestUser();
    
    // Create categories
    const categories = await createCategories(user._id);
    
    // Create filters
    await createFilters(user._id, categories);
    
    // Create emails
    await createEmails(user._id, categories);
    
    console.log('Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing data:', error);
    process.exit(1);
  }
}

// Run initialization
initData();