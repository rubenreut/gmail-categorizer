const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;
const stopwords = require('natural/lib/natural/util/stopwords').words;

/**
 * Extract keywords from email text
 * @param {string} text - The email text content
 * @returns {string[]} Array of keywords extracted from text
 */
function extractKeywords(text) {
  if (!text) return [];
  
  // Convert to lowercase and remove punctuation
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Use TF-IDF to identify important terms
  const tfidf = new TfIdf();
  
  // Add the email text as a document
  tfidf.addDocument(cleanText);
  
  // Add some common email documents to provide contrast
  tfidf.addDocument('hi hello meeting schedule thanks regards');
  tfidf.addDocument('please find attached document information details');
  tfidf.addDocument('let me know if you have any questions concerns');
  
  // Get the top terms
  const terms = [];
  tfidf.listTerms(0).forEach(item => {
    terms.push(item.term);
  });
  
  // Filter terms: remove stopwords and keep meaningful terms
  const extendedStopwords = [
    ...stopwords,
    'email', 'message', 'sent', 'thank', 'thanks', 'hi', 'hello',
    'regards', 'sincerely', 'best', 'please', 'would', 'could'
  ];
  
  const filteredTerms = terms.filter(term => 
    term.length > 3 && 
    !extendedStopwords.includes(term) &&
    !/^\d+$/.test(term) // Remove numbers
  );
  
  // Return top keywords (up to 10)
  return filteredTerms.slice(0, 10);
}

/**
 * Categorize text content based on available categories
 * @param {string} text - The email text content
 * @param {Array} categories - Available categories with keywords
 * @returns {string[]} Array of category IDs that match the text
 */
function categorizeText(text, categories) {
  // Extract keywords from text
  const extractedKeywords = extractKeywords(text);
  
  // Create a map to store category scores
  const categoryScores = new Map();
  
  // Initialize scores for all categories
  categories.forEach(category => {
    categoryScores.set(category._id.toString(), 0);
  });
  
  // Calculate scores for each category
  categories.forEach(category => {
    const categoryId = category._id.toString();
    const categoryKeywords = category.keywords.map(kw => kw.toLowerCase());
    
    // For each extracted keyword, check if it matches any category keyword
    extractedKeywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      // Exact match
      if (categoryKeywords.includes(keywordLower)) {
        categoryScores.set(categoryId, categoryScores.get(categoryId) + 2);
        return;
      }
      
      // Partial match (contained within)
      for (const catKeyword of categoryKeywords) {
        if (keywordLower.includes(catKeyword) || catKeyword.includes(keywordLower)) {
          categoryScores.set(categoryId, categoryScores.get(categoryId) + 1);
          return;
        }
      }
      
      // Use string similarity for fuzzy matching
      for (const catKeyword of categoryKeywords) {
        const similarity = natural.JaroWinklerDistance(keywordLower, catKeyword);
        if (similarity > 0.85) { // High similarity threshold
          categoryScores.set(categoryId, categoryScores.get(categoryId) + similarity);
          return;
        }
      }
    });
  });
  
  // Get categories with scores above threshold
  const threshold = 1.0; // Minimum score to consider a match
  const matchingCategoryIds = Array.from(categoryScores.entries())
    .filter(([_, score]) => score >= threshold)
    .map(([categoryId, _]) => categoryId);
  
  return matchingCategoryIds;
}

module.exports = {
  extractKeywords,
  categorizeText
};