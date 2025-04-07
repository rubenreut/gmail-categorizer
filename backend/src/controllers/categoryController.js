const Category = require('../models/Category');

// Get all categories for a user
exports.getCategories = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming authentication middleware sets req.user
    const categories = await Category.find({ userId });
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get a single category
exports.getCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const category = await Category.findOne({ 
      _id: req.params.id,
      userId 
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const category = await Category.create({
      userId,
      ...req.body
    });
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find category first to check if it's a system category
    const category = await Category.findOne({ 
      _id: req.params.id,
      userId 
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
    
    // Update the category
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find category first to check if it's a system category
    const category = await Category.findOne({ 
      _id: req.params.id,
      userId 
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
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};