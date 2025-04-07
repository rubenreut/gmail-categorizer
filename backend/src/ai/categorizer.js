const Category = require('../models/Category');
const nlpProcessor = require('./nlpProcessor');
const Filter = require('../models/Filter');

/**
 * Categorize an email based on its content and user's categories
 * @param {string} userId - User ID
 * @param {Object} email - Email object to categorize
 * @returns {Promise<string[]>} Array of category IDs
 */
async function categorizeEmail(userId, email) {
  try {
    // Get user's categories
    const categories = await Category.find({ userId });
    
    // Check if this is a metadata-only email
    const isMetadataOnly = email.metadata && email.metadata.isMetadataOnly;
    
    // Extract email content
    const emailText = email.body.text || '';
    const emailSubject = email.subject || '';
    const fromInfo = `${email.from.name} ${email.from.email}`;
    
    // For metadata-only emails, prioritize from/subject info
    let combinedText = isMetadataOnly 
      ? `${emailSubject} ${fromInfo}` // Focus on available metadata
      : `${emailSubject} ${emailText}`; // Use full content when available
    
    // Use NLP to categorize based on available content
    // For metadata-only emails, we'll rely more on filter rules
    const nlpCategoryIds = nlpProcessor.categorizeText(combinedText, categories);
    
    // Apply any user-defined filters
    // These are especially important for metadata-only emails
    const filterActions = await Filter.applyFiltersToEmail(userId, email);
    
    // Get category IDs from filter actions
    const filterCategoryIds = filterActions
      .filter(action => action.type === 'applyCategory')
      .map(action => action.value.toString());
    
    // Combine categories from NLP and filters (remove duplicates)
    const allCategoryIds = [...new Set([...nlpCategoryIds, ...filterCategoryIds])];
    
    // Log for debugging
    if (isMetadataOnly) {
      console.log(`Categorized metadata-only email: ${email.subject} - Categories: ${allCategoryIds.length}`);
    }
    
    return allCategoryIds;
  } catch (error) {
    console.error('Error categorizing email:', error);
    return [];
  }
}

module.exports = {
  categorizeEmail
};