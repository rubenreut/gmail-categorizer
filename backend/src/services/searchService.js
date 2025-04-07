const Email = require('../models/Email');

/**
 * Build or rebuild search index
 * This is a placeholder for a real search indexing service
 */
async function buildSearchIndex() {
  console.log('Building search index...');
  // In a real app, this would use a search engine like Elasticsearch
  // or build MongoDB text indices

  // For now, just return a success message
  return { success: true, message: 'Search index built successfully' };
}

/**
 * Search emails based on query and filters
 * @param {string} userId - User ID
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results with pagination
 */
async function searchEmails(userId, options) {
  const { 
    q = '', 
    page = 1, 
    limit = 20,
    isRead,
    hasAttachment,
    category,
    from,
    dateFrom,
    dateTo
  } = options;

  // Build query
  const query = { userId };

  // Basic text search
  if (q) {
    // In a real app with proper indexing, this would use full-text search
    // For now, use a simple regex search on subject and body
    query.$or = [
      { subject: { $regex: q, $options: 'i' } },
      { 'body.text': { $regex: q, $options: 'i' } }
    ];
  }

  // Add filters
  if (isRead !== undefined) {
    query.isRead = isRead === 'true';
  }

  if (hasAttachment !== undefined) {
    query['metadata.hasAttachments'] = hasAttachment === 'true';
  }

  if (category) {
    query.categories = category;
  }

  if (from) {
    query['from.email'] = { $regex: from, $options: 'i' };
  }

  // Date range
  if (dateFrom || dateTo) {
    query.receivedAt = {};
    if (dateFrom) {
      query.receivedAt.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      query.receivedAt.$lte = new Date(dateTo);
    }
  }

  // Execute search with pagination
  const skip = (page - 1) * limit;
  
  const [results, total] = await Promise.all([
    Email.find(query)
      .sort({ receivedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Email.countDocuments(query)
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);

  return {
    data: results,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
    }
  };
}

/**
 * Get search suggestions based on user input
 * @param {string} userId - User ID
 * @param {string} q - Search query
 * @returns {Promise<string[]>} Array of suggestions
 */
async function getSearchSuggestions(userId, q) {
  if (!q || q.length < 2) {
    return [];
  }

  // In a real app, this would use more sophisticated techniques
  // For simplicity, just find common words in subjects that match the query
  const results = await Email.find({ 
    userId,
    subject: { $regex: q, $options: 'i' }
  })
  .select('subject')
  .limit(10);

  // Extract words from subjects that contain the query
  const suggestions = [];
  results.forEach(email => {
    const words = email.subject.split(/\s+/);
    words.forEach(word => {
      if (word.toLowerCase().includes(q.toLowerCase()) && !suggestions.includes(word)) {
        suggestions.push(word);
      }
    });
  });

  return suggestions.slice(0, 5); // Return top 5 suggestions
}

module.exports = {
  buildSearchIndex,
  searchEmails,
  getSearchSuggestions
};