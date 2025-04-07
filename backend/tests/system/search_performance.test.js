const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const User = require('../../src/models/User');
const Email = require('../../src/models/Email');
const searchService = require('../../src/services/searchService');

// This test checks the performance and accuracy of the search functionality
// with a large number of emails

describe('Search Performance System Test', () => {
  let authToken;
  let testUser;
  const TOTAL_TEST_EMAILS = 500; // Adjust based on test environment capabilities
  
  beforeAll(async () => {
    jest.setTimeout(60000); // Increase timeout for this test
    
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Clear test data
    await User.deleteMany({});
    await Email.deleteMany({});
    
    // Create test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'searchtest@example.com',
        password: 'Test1234!',
        firstName: 'Search',
        lastName: 'Test'
      });
    
    authToken = registerResponse.body.token;
    testUser = registerResponse.body.data;
    
    // Create a large number of test emails
    const emails = [];
    
    // Generate different types of content
    const contentTypes = [
      {
        subject: 'Work Report',
        body: 'This is a work-related report with project updates and statistics.',
        type: 'work'
      },
      {
        subject: 'Meeting Minutes',
        body: 'Minutes from the team meeting discussing roadmap and issues.',
        type: 'work'
      },
      {
        subject: 'Invoice #',
        body: 'Your invoice for recent purchases is attached. Payment due.',
        type: 'finance'
      },
      {
        subject: 'Payment Confirmation',
        body: 'We confirm the receipt of your payment. Thank you.',
        type: 'finance'
      },
      {
        subject: 'Vacation Plans',
        body: 'Details about upcoming vacation and travel arrangements.',
        type: 'personal'
      },
      {
        subject: 'Family Event',
        body: 'Information about the upcoming family gathering next weekend.',
        type: 'personal'
      },
      {
        subject: 'Newsletter',
        body: 'Latest news and updates from our company to keep you informed.',
        type: 'newsletter'
      },
      {
        subject: 'Special Offer',
        body: 'Exclusive deals and discounts available for a limited time.',
        type: 'promotion'
      }
    ];
    
    // Create unique emails with variation in content
    for (let i = 0; i < TOTAL_TEST_EMAILS; i++) {
      const contentIndex = i % contentTypes.length;
      const content = contentTypes[contentIndex];
      
      // Add some variation
      const uniqueId = (i + 1).toString().padStart(3, '0');
      const dayOffset = Math.floor(i / 10); // Groups of emails on different days
      
      const email = {
        userId: testUser._id,
        emailProviderId: `test-id-${uniqueId}`,
        threadId: `thread-${Math.floor(i / 3)}`, // Group in threads
        from: {
          name: `Sender ${contentIndex}`,
          email: `sender${contentIndex}@example.com`
        },
        to: [{
          name: 'Search Test',
          email: 'searchtest@example.com'
        }],
        subject: `${content.subject} ${uniqueId}`,
        body: {
          text: `${content.body} Reference ID: ${uniqueId}.`,
          html: `<p>${content.body} Reference ID: <strong>${uniqueId}</strong>.</p>`
        },
        isRead: i % 3 === 0, // Some read, some unread
        receivedAt: new Date(Date.now() - (dayOffset * 86400000)), // Spread over days
        metadata: {
          importance: i % 5 === 0 ? 'high' : 'normal',
          hasAttachments: i % 4 === 0
        }
      };
      
      emails.push(email);
    }
    
    // Insert in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      await Email.insertMany(batch);
    }
    
    // Build search index
    await searchService.buildSearchIndex();
  });
  
  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await Email.deleteMany({});
    
    // Disconnect
    await mongoose.connection.close();
  });
  
  test('Search should return results quickly', async () => {
    const start = Date.now();
    
    const response = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ q: 'report' });
    
    const duration = Date.now() - start;
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Search should be fast (< 500ms)
    expect(duration).toBeLessThan(500);
    
    // Should find work reports
    const results = response.body.data;
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(email => email.subject.includes('Work Report'))).toBe(true);
  });
  
  test('Search with multiple terms should work correctly', async () => {
    const response = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ q: 'meeting minutes' });
    
    expect(response.status).toBe(200);
    
    // Should find meeting minutes
    const results = response.body.data;
    expect(results.some(email => email.subject.includes('Meeting Minutes'))).toBe(true);
  });
  
  test('Search with filters should combine correctly', async () => {
    const response = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ 
        q: 'payment', 
        isRead: 'false',
        hasAttachment: 'true'
      });
    
    expect(response.status).toBe(200);
    
    const results = response.body.data;
    
    // All results should match filters
    results.forEach(email => {
      expect(email.isRead).toBe(false);
      expect(email.metadata.hasAttachments).toBe(true);
      
      // Should contain payment in subject or body
      const hasPaymentTerm = 
        email.subject.toLowerCase().includes('payment') ||
        email.body.text.toLowerCase().includes('payment');
      
      expect(hasPaymentTerm).toBe(true);
    });
  });
  
  test('Search results should be properly paginated', async () => {
    const PAGE_SIZE = 20;
    
    // Get first page
    const firstPageResponse = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ 
        q: '', // Empty query to match all emails
        page: 1,
        limit: PAGE_SIZE
      });
    
    expect(firstPageResponse.status).toBe(200);
    expect(firstPageResponse.body.data.length).toBe(PAGE_SIZE);
    expect(firstPageResponse.body.pagination.page).toBe(1);
    expect(firstPageResponse.body.pagination.totalPages).toBeGreaterThan(1);
    
    // Get second page
    const secondPageResponse = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ 
        q: '', 
        page: 2,
        limit: PAGE_SIZE
      });
    
    expect(secondPageResponse.status).toBe(200);
    expect(secondPageResponse.body.data.length).toBe(PAGE_SIZE);
    expect(secondPageResponse.body.pagination.page).toBe(2);
    
    // Emails on second page should be different from first page
    const firstPageIds = firstPageResponse.body.data.map(email => email._id);
    const secondPageIds = secondPageResponse.body.data.map(email => email._id);
    
    const overlap = secondPageIds.filter(id => firstPageIds.includes(id));
    expect(overlap.length).toBe(0);
  });
  
  test('Search suggestions should be relevant to user input', async () => {
    // Type partial word to get suggestions
    const response = await request(app)
      .get('/api/search/suggestions')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ q: 'vac' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Should suggest "vacation"
    expect(response.body.data.some(
      suggestion => suggestion.toLowerCase().includes('vacation')
    )).toBe(true);
  });
  
  test('Search should handle special characters properly', async () => {
    const response = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ q: 'invoice #' });
    
    expect(response.status).toBe(200);
    
    // Should find invoices
    const results = response.body.data;
    expect(results.some(email => email.subject.includes('Invoice #'))).toBe(true);
  });
});
