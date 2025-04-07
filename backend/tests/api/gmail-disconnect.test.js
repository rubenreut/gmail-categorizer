const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const app = require('../../src/server');
const jwt = require('jsonwebtoken');

describe('Gmail Disconnect API', () => {
  let token;
  let userId;

  beforeAll(async () => {
    // Create a test user
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      googleTokens: {
        access_token: 'fake-token',
        refresh_token: 'fake-refresh-token',
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        token_type: 'Bearer',
        expiry_date: Date.now() + 3600000
      }
    });
    await user.save();
    userId = user._id;

    // Generate auth token
    token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Clean up
    await User.findByIdAndDelete(userId);
    await mongoose.connection.close();
  });

  test('Should disconnect Gmail account', async () => {
    const res = await request(app)
      .post('/api/gmail/disconnect')
      .set('x-auth-token', token);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Gmail disconnected successfully');

    // Verify tokens were removed
    const user = await User.findById(userId);
    expect(user.googleTokens).toBeNull();
  });

  test('Should handle already disconnected account', async () => {
    const res = await request(app)
      .post('/api/gmail/disconnect')
      .set('x-auth-token', token);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Gmail disconnected successfully');
  });
});