const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const searchService = require('../services/searchService');

/**
 * @route   GET /api/search
 * @desc    Search emails with filters
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    // For demo users, use mock data
    if (req.user.id === 'user123') {
      const searchTerm = req.query.q || '';
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      // Filter mock emails based on the search term
      const mockEmails = [
        {
          _id: 'email1',
          from: { name: 'GitHub', email: 'noreply@github.com' },
          subject: 'New pull request in gmail-categorizer',
          body: { text: 'Feature: Added AI categorization for new emails' },
          receivedAt: new Date(),
          isRead: false,
          metadata: { hasAttachments: false },
          categories: ['cat4'] // Updates
        },
        {
          _id: 'email2',
          from: { name: 'Jane Smith', email: 'jane.smith@company.com' },
          subject: 'Project timeline update',
          body: { text: 'Hi, I\'ve updated the project timeline with the new milestones we discussed yesterday.' },
          receivedAt: new Date(),
          isRead: false,
          metadata: { hasAttachments: true },
          categories: ['cat5'] // Work
        },
        {
          _id: 'email3',
          from: { name: 'LinkedIn', email: 'no-reply@linkedin.com' },
          subject: 'New connection request',
          body: { text: 'John Doe wants to connect with you on LinkedIn' },
          receivedAt: new Date(Date.now() - 86400000), // yesterday
          isRead: true,
          metadata: { hasAttachments: false },
          categories: ['cat2'] // Social
        }
      ];
      
      let filteredEmails = [...mockEmails];
      
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        filteredEmails = mockEmails.filter(email => 
          email.subject.toLowerCase().includes(searchTermLower) || 
          email.body.text.toLowerCase().includes(searchTermLower) ||
          email.from.name.toLowerCase().includes(searchTermLower) ||
          email.from.email.toLowerCase().includes(searchTermLower)
        );
      }
      
      // Apply additional filters
      if (req.query.isRead !== undefined) {
        filteredEmails = filteredEmails.filter(email => 
          email.isRead === (req.query.isRead === 'true')
        );
      }
      
      if (req.query.hasAttachment !== undefined) {
        filteredEmails = filteredEmails.filter(email => 
          email.metadata.hasAttachments === (req.query.hasAttachment === 'true')
        );
      }
      
      if (req.query.category) {
        filteredEmails = filteredEmails.filter(email => 
          email.categories.includes(req.query.category)
        );
      }
      
      return res.json({
        success: true,
        data: filteredEmails,
        pagination: {
          page,
          limit,
          total: filteredEmails.length,
          totalPages: Math.ceil(filteredEmails.length / limit)
        }
      });
    }
    
    // For real users, use the search service
    const results = await searchService.searchEmails(req.user.id, req.query);
    
    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions based on user input
 * @access  Private
 */
router.get('/suggestions', auth, async (req, res) => {
  try {
    // For demo users, use mock data
    if (req.user.id === 'user123') {
      const q = req.query.q || '';
      
      if (!q || q.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }
      
      // Return some mock suggestions based on the query
      const mockSuggestions = [];
      
      if ('project'.includes(q.toLowerCase())) {
        mockSuggestions.push('Project');
        mockSuggestions.push('Project timeline');
      }
      
      if ('pull'.includes(q.toLowerCase())) {
        mockSuggestions.push('Pull request');
      }
      
      if ('github'.includes(q.toLowerCase())) {
        mockSuggestions.push('GitHub');
      }
      
      if ('linked'.includes(q.toLowerCase()) || 'linkedin'.includes(q.toLowerCase())) {
        mockSuggestions.push('LinkedIn');
        mockSuggestions.push('Connection request');
      }
      
      return res.json({
        success: true,
        data: mockSuggestions
      });
    }
    
    // For real users, use the search service
    const suggestions = await searchService.getSearchSuggestions(req.user.id, req.query.q);
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;