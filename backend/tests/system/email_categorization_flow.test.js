const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const User = require('../../src/models/User');
const Category = require('../../src/models/Category');
const Email = require('../../src/models/Email');
const Filter = require('../../src/models/Filter');

// This test simulates the entire flow of receiving, categorizing, and
// retrieving emails through the system

describe('Email Categorization System Test', () => {
  let authToken;
  let testUser;
  let categories = [];
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Clear test data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Email.deleteMany({});
    await Filter.deleteMany({});
    
    // Step 1: Register a user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'systemtest@example.com',
        password: 'Test1234!',
        firstName: 'System',
        lastName: 'Test'
      });
    
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);
    
    authToken = registerResponse.body.token;
    testUser = registerResponse.body.data;
  });
  
  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await Category.deleteMany({});
    await Email.deleteMany({});
    await Filter.deleteMany({});
    
    // Disconnect
    await mongoose.connection.close();
  });
  
  test('Step 1: System should create default categories for new user', async () => {
    // Get categories - system should have created default ones
    const categoriesResponse = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(categoriesResponse.status).toBe(200);
    expect(categoriesResponse.body.success).toBe(true);
    expect(categoriesResponse.body.data.length).toBeGreaterThan(0);
    
    // Save categories for later use
    categories = categoriesResponse.body.data;
    
    // Should have Primary, Social, Promotions, etc.
    const hasSystemCategories = categories.some(c => c.isSystem);
    expect(hasSystemCategories).toBe(true);
  });
  
  test('Step 2: User should be able to create a custom category', async () => {
    const customCategory = {
      name: 'Travel',
      color: '#9c27b0',
      icon: 'flight',
      keywords: ['travel', 'flight', 'hotel', 'booking', 'vacation', 'trip']
    };
    
    const createCategoryResponse = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send(customCategory);
    
    expect(createCategoryResponse.status).toBe(201);
    expect(createCategoryResponse.body.success).toBe(true);
    expect(createCategoryResponse.body.data.name).toBe('Travel');
    
    // Add to categories array
    categories.push(createCategoryResponse.body.data);
  });
  
  test('Step 3: User should be able to create a filter', async () => {
    // Find the Travel category
    const travelCategory = categories.find(c => c.name === 'Travel');
    
    const filter = {
      name: 'Travel Emails',
      isActive: true,
      conditions: [
        {
          field: 'from',
          operator: 'contains',
          value: 'airline.com',
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
        }
      ]
    };
    
    const createFilterResponse = await request(app)
      .post('/api/filters')
      .set('Authorization', `Bearer ${authToken}`)
      .send(filter);
    
    expect(createFilterResponse.status).toBe(201);
    expect(createFilterResponse.body.success).toBe(true);
    expect(createFilterResponse.body.data.name).toBe('Travel Emails');
  });
  
  test('Step 4: Fetching emails should categorize them automatically', async () => {
    // Simulate incoming emails
    const testEmails = [
      {
        emailProviderId: 'test-id-1',
        threadId: 'thread-1',
        from: {
          name: 'Airline Bookings',
          email: 'bookings@airline.com'
        },
        to: [{
          name: 'System Test',
          email: 'systemtest@example.com'
        }],
        subject: 'Your Flight Booking Confirmation',
        body: {
          text: 'Thank you for booking your flight. Your reservation details are attached.',
          html: '<p>Thank you for booking your flight. Your reservation details are attached.</p>'
        },
        receivedAt: new Date()
      },
      {
        emailProviderId: 'test-id-2',
        threadId: 'thread-2',
        from: {
          name: 'Newsletter',
          email: 'newsletter@example.com'
        },
        to: [{
          name: 'System Test',
          email: 'systemtest@example.com'
        }],
        subject: 'Weekly Newsletter',
        body: {
          text: 'Check out our latest news and updates.',
          html: '<p>Check out our latest news and updates.</p>'
        },
        receivedAt: new Date()
      }
    ];
    
    // Normally done via webhook or polling, but we'll use direct API
    for (const email of testEmails) {
      await Email.create({
        ...email,
        userId: testUser._id
      });
    }
    
    // Trigger email fetch and categorization
    const fetchResponse = await request(app)
      .post('/api/emails/fetch')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(fetchResponse.status).toBe(200);
    
    // Wait briefly for categorization to complete (async process)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get emails to check categorization
    const emailsResponse = await request(app)
      .get('/api/emails')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(emailsResponse.status).toBe(200);
    expect(emailsResponse.body.data.length).toBe(2);
    
    // The airline email should be categorized as "Travel"
    const travelCategory = categories.find(c => c.name === 'Travel');
    const airlineEmail = emailsResponse.body.data.find(
      e => e.subject === 'Your Flight Booking Confirmation'
    );
    
    expect(airlineEmail.categories).toContain(travelCategory._id);
