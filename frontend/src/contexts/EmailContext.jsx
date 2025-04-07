import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const EmailContext = createContext();

export const EmailProvider = ({ children }) => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    if (currentUser) {
      fetchEmails();
    }
  }, [currentUser, pagination.page, pagination.limit]);

  const fetchEmails = async (categoryId = null, options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      let url = `${API_URL}/api/emails`;
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...options
      };
      
      if (categoryId) {
        params.category = categoryId;
      }
      
      const response = await axios.get(url, { params });
      
      // Make sure each email has a unique ID to prevent rendering duplicates
      const uniqueEmails = response.data.data.reduce((unique, email) => {
        // Only add the email if it doesn't already exist in our array
        if (!unique.some(e => e._id === email._id)) {
          unique.push(email);
        }
        return unique;
      }, []);
      
      setEmails(uniqueEmails);
      setPagination(response.data.pagination || pagination);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching emails:', error);
      setError('Failed to load emails');
      setLoading(false);
      
      // For demo, set mock emails if the API fails
      setEmails([
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
      ]);
    }
  };

  const getEmail = async (emailId) => {
    try {
      setError(null);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.get(`${API_URL}/api/emails/${emailId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching email:', error);
      setError(error.response?.data?.error || 'Failed to fetch email');
      return { success: false, error: error.response?.data?.error || 'Failed to fetch email' };
    }
  };

  // Helper function to trigger background sync
  const triggerBackgroundSync = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      await axios.post(`${API_URL}/api/emails/sync`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
    } catch (error) {
      console.log('Background sync error (non-critical):', error);
    }
  };

  const updateEmail = async (emailId, updateData) => {
    try {
      setError(null);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.patch(`${API_URL}/api/emails/${emailId}`, updateData);
      
      setEmails(emails.map(email => 
        email._id === emailId ? response.data.data : email
      ));
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error updating email:', error);
      setError(error.response?.data?.error || 'Failed to update email');
      return { success: false, error: error.response?.data?.error || 'Failed to update email' };
    }
  };

  const markAsRead = async (emailId) => {
    // Update email in our system and sync with Gmail
    const result = await updateEmail(emailId, { isRead: true });
    
    // Trigger background sync with Gmail
    triggerBackgroundSync();
    
    return result;
  };

  const markAsUnread = async (emailId) => {
    // Update email in our system and sync with Gmail
    const result = await updateEmail(emailId, { isRead: false });
    
    // Trigger background sync with Gmail
    triggerBackgroundSync();
    
    return result;
  };

  const changeCategory = async (emailId, categoryId) => {
    const result = await updateEmail(emailId, { 
      addCategories: [categoryId] 
    });
    
    // Trigger background sync with Gmail
    triggerBackgroundSync();
    
    return result;
  };

  const removeCategory = async (emailId, categoryId) => {
    const result = await updateEmail(emailId, { 
      removeCategories: [categoryId] 
    });
    
    // Trigger background sync with Gmail
    triggerBackgroundSync();
    
    return result;
  };

  const fetchNewEmails = async (fullSync = false) => {
    try {
      setError(null);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.post(
        `${API_URL}/api/emails/fetch${fullSync ? '?fullSync=true' : ''}`
      );
      
      // If full sync, add loading state to indicate that a background process is happening
      if (fullSync) {
        setLoading(true);
        
        // Poll for sync status
        const checkSyncStatus = async () => {
          try {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
            const statusResponse = await axios.get(`${API_URL}/api/emails/sync-status`);
            
            if (statusResponse.data.success) {
              // If a significant number of emails have been fetched or status is complete, refresh the email list
              const { lastSync, emailCount, isComplete } = statusResponse.data.data;
              
              if (lastSync && (isComplete || emailCount > 0)) {
                await fetchEmails();
                
                // If complete, stop polling
                if (isComplete) {
                  setLoading(false);
                  return;
                }
              }
            }
            
            // Continue polling every 5 seconds
            setTimeout(checkSyncStatus, 5000);
          } catch (err) {
            console.error('Error checking sync status:', err);
            setLoading(false);
          }
        };
        
        // Start the polling process
        setTimeout(checkSyncStatus, 3000);
      } else {
        // For non-full sync, just reload immediately
        fetchEmails();
      }
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching new emails:', error);
      
      // Special handling for scope/permission errors
      if (error.response?.status === 403 && error.response?.data?.scopeError) {
        const errorMessage = 'Limited Gmail access: Please disconnect and reconnect your Gmail account to grant full permissions.';
        
        // Show a more prominent notification for permission issues
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '15px 20px';
        notification.style.backgroundColor = '#f44336';
        notification.style.color = 'white';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';
        notification.style.zIndex = '9999';
        notification.style.maxWidth = '90%';
        notification.style.width = '600px';
        notification.style.fontSize = '14px';
        notification.innerHTML = `
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="font-size: 24px;">⚠️</div>
            <div>
              <div style="font-weight: bold; margin-bottom: 5px; font-size: 16px;">
                Gmail Permission Required
              </div>
              <div>
                ${errorMessage}
                <div style="margin-top: 8px">
                  <strong>Please go to Settings → Gmail Integration → Disconnect → then reconnect</strong>
                </div>
              </div>
            </div>
            <button 
              style="margin-left: auto; background: transparent; border: 1px solid white; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer;"
              onclick="this.parentNode.parentNode.remove()">
              Dismiss
            </button>
          </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 15 seconds
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 15000);
        
        setError(errorMessage);
        return { 
          success: false, 
          error: errorMessage,
          scopeError: true
        };
      }
      
      // Regular error handling
      const errorMessage = error.response?.data?.error || 'Failed to fetch new emails';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const searchEmails = async (searchQuery, filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        q: searchQuery,
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.get(`${API_URL}/api/search`, { params });
      
      setEmails(response.data.data);
      setPagination(response.data.pagination || pagination);
      setLoading(false);
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error searching emails:', error);
      setError(error.response?.data?.error || 'Search failed');
      setLoading(false);
      return { success: false, error: error.response?.data?.error || 'Search failed' };
    }
  };

  const setPage = (page) => {
    setPagination({
      ...pagination,
      page
    });
  };

  const setLimit = (limit) => {
    setPagination({
      ...pagination,
      limit,
      page: 1 // Reset to first page when changing limit
    });
  };

  const cleanupDuplicates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.post(`${API_URL}/api/emails/cleanup-duplicates`);
      
      if (response.data.success) {
        // Refresh the emails list after cleanup
        await fetchEmails();
        return { 
          success: true, 
          message: response.data.message,
          initialCount: response.data.initialCount,
          finalCount: response.data.finalCount,
          removedCount: response.data.removedCount
        };
      } else {
        setError('Failed to clean up duplicates');
        return { success: false, error: 'Failed to clean up duplicates' };
      }
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      setError(error.response?.data?.error || 'Failed to clean up duplicates');
      return { success: false, error: error.response?.data?.error || 'Failed to clean up duplicates' };
    } finally {
      setLoading(false);
    }
  };

  // Expose a way to manually set loading state
  const setLoadingState = (isLoading) => {
    setLoading(isLoading);
  };

  return (
    <EmailContext.Provider
      value={{
        emails,
        loading,
        error,
        pagination,
        fetchEmails,
        getEmail,
        updateEmail,
        markAsRead,
        markAsUnread,
        changeCategory,
        removeCategory,
        fetchNewEmails,
        searchEmails,
        setPage,
        setLimit,
        cleanupDuplicates,
        setLoading: setLoadingState
      }}
    >
      {children}
    </EmailContext.Provider>
  );
};