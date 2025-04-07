const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
  try {
    // Check if it's the demo user
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        data: {
          _id: 'user123',
          email: 'demo@example.com',
          firstName: 'Demo',
          lastName: 'User'
        }
      });
    }
    
    // Google users are now regular MongoDB users, so no special handling needed
    
    // Get user from database
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/users/me
 * @desc    Update user profile
 * @access  Private
 */
router.put('/me', auth, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    
    // Check if it's the demo user
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        data: {
          _id: 'user123',
          email: 'demo@example.com',
          firstName: firstName || 'Demo',
          lastName: lastName || 'User'
        }
      });
    }
    
    // Google users are now regular MongoDB users, so no special handling needed
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/users/me/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/me/preferences', auth, async (req, res) => {
  try {
    // Check if it's the demo user
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        data: {
          ...req.body
        }
      });
    }
    
    // Google users are now regular MongoDB users, so no special handling needed
    
    // Update user preferences
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { preferences: req.body },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      data: user.preferences
    });
  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;