const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Email = require('../../src/models/Email');
const Category = require('../../src/models/Category');
const Filter = require('../../src/models/Filter');
const categorizer = require('../../src/ai/categorizer');
const nlpProcessor = require('../../src/ai/nlpProcessor');

let testUser;
let testEmail;
let categories;

beforeAll(async () => {
  // Connect to test database
  await mongoose.connect(process.env.MONGODB_TEST_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
  });
  
  // Create test user
  testUser = await User.create({
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  });
  
  // Create test categories
  categories = await Category.insertMany([
    {
      userId: testUser._id,
      name: 'Work',
      color: '#4285f4',
      icon: 'work',
      isSystem: false,
      keywords: ['office', 'meeting', 'project', 'deadline', 'report']
    },
    {
      userId: testUser._id,
      name: 'Finance',
      color: '#0f9d58',
      icon: 'account_balance',
      isSystem: false,
      keywords: ['invoice', 'payment', 'transaction', 'receipt', 'bill']
    },
    {
      userId: testUser._id,
      name: 'Social',
      color: '#db4437',
      icon: 'people',
      isSystem: true,
      keywords: ['facebook', 'twitter', 'instagram', 'linkedin', 'social']
    }
  ]);
  
  // Create test email
  testEmail = await Email.create({
    userId: testUser._id,
    emailProviderId: 'test123',
    threadId: 'thread123',
    from: {
      name: 'John Smith',
      email: 'john@company.com'
    },
    to: [{
      name: 'Test User',
      email: 'test@example.com'
    }],
    subject: 'Project Update and Meeting Schedule',
    body: {
      text: 'Hello, I wanted to provide an update on the project status. We have a meeting scheduled for tomorrow at 2 PM to discuss the progress. Please review the attached report before the meeting. Regards, John',
      html: '<div>Hello,<br><br>I wanted to provide an update on the project status. We have a meeting scheduled for tomorrow at 2 PM to discuss the progress.<br><br>Please review the attached report before the meeting.<br><br>Regards,<br>John</div>'
    },
    attachments: [{
      filename: 'report.pdf',
      contentType: 'application/pdf',
      size: 1024,
      url: 'https://example.com/report.pdf'
    }],
    isRead: false,
    receivedAt: new Date(),
    metadata: {
      importance: 'normal',
      hasAttachments: true
    }
  });
});

afterAll(async () => {
  // Clean up test data
  await User.deleteMany({});
  await Email.deleteMany({});
  await Category.deleteMany({});
  await Filter.deleteMany({});
  
  // Disconnect from test database
  await mongoose.connection.close();
});

describe('Email Categorization Integration Tests', () => {
  test('NLP processor should extract relevant keywords from email', () => {
    const emailText = testEmail.body.text;
    const keywords = nlpProcessor.extractKeywords(emailText);
    
    expect(keywords).toContain('project');
    expect(keywords).toContain('meeting');
    expect(keywords).toContain('report');
  });
  
  test('NLP processor should categorize email text correctly', () => {
    const emailText = testEmail.body.text;
    const categoryIds = nlpProcessor.categorizeText(emailText, categories);
    
    // Should match the "Work" category
    expect(categoryIds).toContain(categories[0]._id.toString());
    
    // Should not match the "Finance" category
    expect(categoryIds).not.toContain(categories[1]._id.toString());
  });
  
  test('Categorizer should apply correct categories to email', async () => {
    const result = await categorizer.categorizeEmail(testUser._id, testEmail);
    
    // Should include the Work category
    expect(result).toContain(categories[0]._id.toString());
    
    // Since the email has keywords like "project", "meeting", and "report" which
    // are in the Work category keywords
  });
  
  test('Filter rules should correctly identify matching emails', async () => {
    // Create a test filter
    const filter = await Filter.create({
      userId: testUser._id,
      name: 'Work Emails Filter',
      isActive: true,
      conditions: [
        {
          field: 'subject',
          operator: 'contains',
          value: 'Project',
          caseSensitive: false
        },
        {
          field: 'from',
          operator: 'contains',
          value: 'company.com',
          caseSensitive: false
        }
      ],
      conditionsMatch: 'all',
      actions: [
        {
          type: 'applyCategory',
          value: categories[0]._id // Work category
        }
      ]
    });
    
    // Test if filter matches the email
    const matches = filter.matchesEmail(testEmail);
    expect(matches).toBe(true);
    
    // Create a filter that shouldn't match
    const nonMatchingFilter = await Filter.create({
      userId: testUser._id,
      name: 'Finance Emails Filter',
      isActive: true,
      conditions: [
        {
          field: 'subject',
          operator: 'contains',
          value: 'Invoice',
          caseSensitive: false
        }
      ],
      conditionsMatch: 'all',
      actions: [
        {
          type: 'applyCategory',
          value: categories[1]._id // Finance category
        }
      ]
    });
    
    // Test that filter doesn't match
    const nonMatches = nonMatchingFilter.matchesEmail(testEmail);
    expect(nonMatches).toBe(false);
  });
  
  test('Applying all filters to an email should return correct actions', async () => {
    const actions = await Filter.applyFiltersToEmail(testUser._id, testEmail);
    
    // Should include at least one action
    expect(actions.length).toBeGreaterThan(0);
    
    // Should include an action to apply the Work category
    const applyWorkCategoryAction = actions.find(
      action => action.type === 'applyCategory' && 
                action.value.toString() === categories[0]._id.toString()
    );
    
    expect(applyWorkCategoryAction).toBeDefined();
  });
});
