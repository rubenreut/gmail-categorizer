const Category = require('../models/Category');

/**
 * System categories to be created for each new user
 * @type {Array}
 */
const DEFAULT_SYSTEM_CATEGORIES = [
  {
    name: 'Primary',
    color: '#4285f4',
    icon: 'inbox',
    isSystem: true,
    keywords: ['important', 'primary', 'inbox', 'priority', 'urgent', 'critical']
  },
  {
    name: 'Social',
    color: '#ea4335',
    icon: 'people',
    isSystem: true,
    keywords: ['facebook', 'twitter', 'instagram', 'linkedin', 'social', 'network', 'friend', 'connection', 'like', 'share', 'post']
  },
  {
    name: 'Promotions',
    color: '#34a853',
    icon: 'local_offer',
    isSystem: true,
    keywords: ['offer', 'discount', 'sale', 'deal', 'coupon', 'promo', 'promotion', 'marketing', 'subscribe', 'newsletter']
  },
  {
    name: 'Updates',
    color: '#fbbc04',
    icon: 'info',
    isSystem: true,
    keywords: ['update', 'notification', 'alert', 'status', 'confirm', 'confirmation', 'verify', 'verification']
  },
  {
    name: 'Forums',
    color: '#673ab7',
    icon: 'forum',
    isSystem: true,
    keywords: ['forum', 'discussion', 'thread', 'reply', 'comment', 'topic', 'post', 'community', 'group']
  }
];

/**
 * Create default system categories for a new user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Created categories
 */
async function createSystemCategories(userId) {
  try {
    // Check if user already has system categories
    const existingCategories = await Category.find({ 
      userId, 
      isSystem: true 
    });
    
    if (existingCategories.length > 0) {
      return existingCategories;
    }
    
    // Prepare category documents
    const categoryDocs = DEFAULT_SYSTEM_CATEGORIES.map(category => ({
      ...category,
      userId
    }));
    
    // Insert all categories at once
    const categories = await Category.insertMany(categoryDocs);
    
    return categories;
  } catch (error) {
    console.error('Error creating system categories:', error);
    throw error;
  }
}

module.exports = {
  createSystemCategories,
  DEFAULT_SYSTEM_CATEGORIES
};