const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const app = require('../../src/server');
const jwt = require('jsonwebtoken');

describe('Gmail Sync Interval API', () => {
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
      },
      syncInterval: 15
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

  test('Should update sync interval', async () => {
    const res = await request(app)
      .post('/api/gmail/sync-interval')
      .set('x-auth-token', token)
      .send({ interval: 30 });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.syncInterval).toBe(30);

    // Verify the interval was updated in the database
    const user = await User.findById(userId);
    expect(user.syncInterval).toBe(30);
  });

  test('Should set interval to 0 for manual sync only', async () => {
    const res = await request(app)
      .post('/api/gmail/sync-interval')
      .set('x-auth-token', token)
      .send({ interval: 0 });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.syncInterval).toBe(0);

    // Verify the interval was updated in the database
    const user = await User.findById(userId);
    expect(user.syncInterval).toBe(0);
  });

  test('Should reject invalid interval', async () => {
    const res = await request(app)
      .post('/api/gmail/sync-interval')
      .set('x-auth-token', token)
      .send({ interval: -1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid sync interval');

    // Verify the interval was not updated
    const user = await User.findById(userId);
    expect(user.syncInterval).toBe(0); // Still 0 from previous test
  });
});