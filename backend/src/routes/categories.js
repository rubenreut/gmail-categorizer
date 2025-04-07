const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Category = require('../models/Category');

/**
 * @route   GET /api/categories
 * @desc    Get all categories for the user
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    // Check if it's the demo user
    if (req.user.id === 'user123') {
      return res.json({
        success: true,
        data: [
          { _id: 'cat1', name: 'Primary', color: '#4285f4', icon: 'inbox', isSystem: true },
          { _id: 'cat2', name: 'Social', color: '#ea4335', icon: 'people', isSystem: true },
          { _id: 'cat3', name: 'Promotions', color: '#34a853', icon: 'local_offer', isSystem: true },
          { _id: 'cat4', name: 'Updates', color: '#fbbc04', icon: 'info', isSystem: true },
          { _id: 'cat5', name: 'Work', color: '#0097a7', icon: 'work', isSystem: false },
          { _id: 'cat6', name: 'Travel', color: '#f06292', icon: 'flight', isSystem: false }
        ]
      });
    }
    
    // Get real categories
    const categories = await Category.find({ userId: req.user.id });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const category = await Category.findOne({ 
      _id: req.params.id,
      userId: req.user.id 
    });
    
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, color, icon, keywords } = req.body;
    
    const category = new Category({
      userId: req.user.id,
      name,
      color: color || '#4285f4',
      icon: icon || 'label',
      isSystem: false,
      keywords: keywords || []
    });
    
    await category.save();
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/categories/:id
 * @desc    Update a category
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    // Find category first to check if it's a system category
    const category = await Category.findOne({ 
      _id: req.params.id,
      userId: req.user.id 
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    // Prevent modifying system categories
    if (category.isSystem) {
      return res.status(403).json({
        success: false,
        error: 'System categories cannot be modified'
      });
    }
    
    // Update fields
    if (req.body.name) category.name = req.body.name;
    if (req.body.color) category.color = req.body.color;
    if (req.body.icon) category.icon = req.body.icon;
    if (req.body.keywords) category.keywords = req.body.keywords;
    
    // Save changes
    await category.save();
    
    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    // Find category first to check if it's a system category
    const category = await Category.findOne({ 
      _id: req.params.id,
      userId: req.user.id 
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    // Prevent deleting system categories
    if (category.isSystem) {
      return res.status(403).json({
        success: false,
        error: 'System categories cannot be deleted'
      });
    }
    
    // Delete the category
    await Category.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;