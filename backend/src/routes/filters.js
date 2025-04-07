const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Filter = require('../models/Filter');

/**
 * @route   GET /api/filters
 * @desc    Get all filters for the user
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
            _id: 'filter1',
            name: 'Work Emails',
            isActive: true,
            conditions: [
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
                value: 'cat5' // Work category
              }
            ]
          },
          {
            _id: 'filter2',
            name: 'Social Media',
            isActive: true,
            conditions: [
              {
                field: 'from',
                operator: 'contains',
                value: 'linkedin.com',
                caseSensitive: false
              },
              {
                field: 'from',
                operator: 'contains',
                value: 'twitter.com',
                caseSensitive: false
              },
              {
                field: 'from',
                operator: 'contains',
                value: 'facebook.com',
                caseSensitive: false
              }
            ],
            conditionsMatch: 'any',
            actions: [
              {
                type: 'applyCategory',
                value: 'cat2' // Social category
              }
            ]
          }
        ]
      });
    }
    
    // Get real filters
    const filters = await Filter.find({ userId: req.user.id });
    
    res.json({
      success: true,
      data: filters
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/filters/:id
 * @desc    Get filter by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const filter = await Filter.findOne({ 
      _id: req.params.id,
      userId: req.user.id 
    });
    
    if (!filter) {
      return res.status(404).json({ success: false, error: 'Filter not found' });
    }
    
    res.json({
      success: true,
      data: filter
    });
  } catch (error) {
    console.error('Get filter error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/filters
 * @desc    Create a new filter
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, isActive, conditions, conditionsMatch, actions } = req.body;
    
    const filter = new Filter({
      userId: req.user.id,
      name,
      isActive: isActive !== undefined ? isActive : true,
      conditions,
      conditionsMatch: conditionsMatch || 'all',
      actions
    });
    
    await filter.save();
    
    res.status(201).json({
      success: true,
      data: filter
    });
  } catch (error) {
    console.error('Create filter error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/filters/:id
 * @desc    Update a filter
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    // Find filter first
    const filter = await Filter.findOne({ 
      _id: req.params.id,
      userId: req.user.id 
    });
    
    if (!filter) {
      return res.status(404).json({
        success: false,
        error: 'Filter not found'
      });
    }
    
    // Update fields
    if (req.body.name) filter.name = req.body.name;
    if (req.body.isActive !== undefined) filter.isActive = req.body.isActive;
    if (req.body.conditions) filter.conditions = req.body.conditions;
    if (req.body.conditionsMatch) filter.conditionsMatch = req.body.conditionsMatch;
    if (req.body.actions) filter.actions = req.body.actions;
    
    // Save changes
    await filter.save();
    
    res.json({
      success: true,
      data: filter
    });
  } catch (error) {
    console.error('Update filter error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   DELETE /api/filters/:id
 * @desc    Delete a filter
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await Filter.deleteOne({ 
      _id: req.params.id,
      userId: req.user.id 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Filter not found'
      });
    }
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete filter error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PATCH /api/filters/:id/activate
 * @desc    Activate a filter
 * @access  Private
 */
router.patch('/:id/activate', auth, async (req, res) => {
  try {
    const filter = await Filter.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isActive: true },
      { new: true }
    );
    
    if (!filter) {
      return res.status(404).json({
        success: false,
        error: 'Filter not found'
      });
    }
    
    res.json({
      success: true,
      data: filter
    });
  } catch (error) {
    console.error('Activate filter error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PATCH /api/filters/:id/deactivate
 * @desc    Deactivate a filter
 * @access  Private
 */
router.patch('/:id/deactivate', auth, async (req, res) => {
  try {
    const filter = await Filter.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isActive: false },
      { new: true }
    );
    
    if (!filter) {
      return res.status(404).json({
        success: false,
        error: 'Filter not found'
      });
    }
    
    res.json({
      success: true,
      data: filter
    });
  } catch (error) {
    console.error('Deactivate filter error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;