const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const User = require('../../src/models/User');
const Category = require('../../src/models/Category');
const Filter = require('../../src/models/Filter');

// This test simulates the user journey from signup to setting up
// custom categories and filters

describe('User Flow System Test', () => {
  let authToken;
  let userId;
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Clear test data
    await User.deleteMany({});
    await Category.deleteMany({});
    await Filter.deleteMany({});
  });
  
  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await Category.deleteMany({});
    await Filter.deleteMany({});
    
    // Disconnect
    await mongoose.connection.close();
  });
  
  test('Step 1: User should be able to register', async () => {
    const userData = {
      email: 'userflow@example.com',
      password: 'SecurePassword123!',
      firstName: 'User',
      lastName: 'Flow'
    };
    
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
    
    authToken = response.body.token;
    userId = response.body.data._id;
  });
  
  test('Step 2: User should have default system categories', async () => {
    const response = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    // Should have system categories
    const systemCategories = response.body.data.filter(c => c.isSystem);
    expect(systemCategories.length).toBeGreaterThan(0);
    
    // Should include Primary, Social, etc.
    const categoryNames = systemCategories.map(c => c.name);
    expect(categoryNames).toContain('Primary');
    expect(categoryNames).toContain('Social');
  });
  
  test('Step 3: User should be able to update their preferences', async () => {
    const preferences = {
      theme: 'dark',
      emailsPerPage: 100,
      categorization: {
        applyAutomatically: true,
        mlSuggestions: true
      },
      notifications: {
        enabled: true,
        emailDigest: false
      }
    };
    
    const response = await request(app)
      .put('/api/users/me/preferences')
      .set('Authorization', `Bearer ${authToken}`)
      .send(preferences);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.theme).toBe('dark');
    expect(response.body.data.emailsPerPage).toBe(100);
  });
  
  test('Step 4: User should be able to create a custom category', async () => {
    const categoryData = {
      name: 'Personal Projects',
      color: '#673ab7',
      icon: 'assignment',
      keywords: ['project', 'personal', 'idea', 'todo']
    };
    
    const response = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send(categoryData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Personal Projects');
    expect(response.body.data.keywords).toEqual(expect.arrayContaining(categoryData.keywords));
    
    const newCategoryId = response.body.data._id;
    
    // Verify the category was properly saved
    const getResponse = await request(app)
      .get(`/api/categories/${newCategoryId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.name).toBe('Personal Projects');
  });
  
  test('Step 5: User should be able to create a filter', async () => {
    // Get categories to find the Personal Projects category
    const getCategoriesResponse = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${authToken}`);
    
    const personalProjectsCategory = getCategoriesResponse.body.data.find(
      c => c.name === 'Personal Projects'
    );
    
    const filterData = {
      name: 'Personal Project Emails',
      isActive: true,
      conditions: [
        {
          field: 'subject',
          operator: 'contains',
          value: 'project',
          caseSensitive: false
        },
        {
          field: 'body',
          operator: 'contains',
          value: 'idea',
          caseSensitive: false
        }
      ],
      conditionsMatch: 'any',
      actions: [
        {
          type: 'applyCategory',
          value: personalProjectsCategory._id
        },
        {
          type: 'markAsRead',
          value: ''
        }
      ]
    };
    
    const response = await request(app)
      .post('/api/filters')
      .set('Authorization', `Bearer ${authToken}`)
      .send(filterData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Personal Project Emails');
    expect(response.body.data.conditions.length).toBe(2);
    expect(response.body.data.actions.length).toBe(2);
    
    const newFilterId = response.body.data._id;
    
    // Verify the filter was properly saved
    const getResponse = await request(app)
      .get(`/api/filters/${newFilterId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.name).toBe('Personal Project Emails');
  });
  
  test('Step 6: User should be able to update an existing filter', async () => {
    // Get filters
    const getFiltersResponse = await request(app)
      .get('/api/filters')
      .set('Authorization', `Bearer ${authToken}`);
    
    const filter = getFiltersResponse.body.data[0];
    
    // Update filter
    const updateData = {
      name: 'Updated Project Filter',
      conditions: [
        ...filter.conditions,
        {
          field: 'from',
          operator: 'contains',
          value: 'projects@',
          caseSensitive: false
        }
      ]
    };
    
    const response = await request(app)
      .put(`/api/filters/${filter._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Updated Project Filter');
    expect(response.body.data.conditions.length).toBe(3);
  });
  
  test('Step 7: User should be able to update a category', async () => {
    // Get categories
    const getCategoriesResponse = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${authToken}`);
    
    const personalProjectsCategory = getCategoriesResponse.body.data.find(
      c => c.name === 'Personal Projects'
    );
    
    // Update category
    const updateData = {
      name: 'Projects',
      keywords: [...personalProjectsCategory.keywords, 'task', 'milestone']
    };
    
    const response = await request(app)
      .put(`/api/categories/${personalProjectsCategory._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Projects');
    expect(response.body.data.keywords).toContain('task');
    expect(response.body.data.keywords).toContain('milestone');
  });
  
  test('Step 8: System should prevent modifying system categories', async () => {
    // Get categories
    const getCategoriesResponse = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${authToken}`);
    
    const primaryCategory = getCategoriesResponse.body.data.find(
      c => c.name === 'Primary' && c.isSystem
    );
    
    // Try to update a system category
    const updateData = {
      name: 'Changed Primary'
    };
    
    const response = await request(app)
      .put(`/api/categories/${primaryCategory._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData);
    
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('System categories cannot be modified');
  });
  
  test('Step 9: User should be able to deactivate a filter', async () => {
    // Get filters
    const getFiltersResponse = await request(app)
      .get('/api/filters')
      .set('Authorization', `Bearer ${authToken}`);
    
    const filter = getFiltersResponse.body.data[0];
    
    // Deactivate filter
    const response = await request(app)
      .patch(`/api/filters/${filter._id}/deactivate`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.isActive).toBe(false);
  });
  
  test('Step 10: User should be able to delete a custom category', async () => {
    // Get categories
    const getCategoriesResponse = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${authToken}`);
    
    const projectsCategory = getCategoriesResponse.body.data.find(
      c => c.name === 'Projects'
    );
    
    // Delete category
    const response = await request(app)
      .delete(`/api/categories/${projectsCategory._id}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Verify it's gone
    const getResponse = await request(app)
      .get(`/api/categories/${projectsCategory._id}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(getResponse.status).toBe(404);
  });
});
