import React, { useContext, useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CategoryContext } from '../contexts/CategoryContext';
import { EmailContext } from '../contexts/EmailContext';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';

// Import from mockup to get started quickly
import '../components/mockups/DashboardMockup.css';

const Dashboard = () => {
  const { categories, loading: categoriesLoading } = useContext(CategoryContext);
  const { 
    emails, 
    loading: emailsLoading, 
    setLoading: setEmailsLoading,
    fetchNewEmails, 
    fetchEmails,
    pagination, 
    setPage, 
    setLimit,
    cleanupDuplicates
  } = useContext(EmailContext);
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // State for sorting
  const [sortOrder, setSortOrder] = useState('newest');
  const [totalEmailCount, setTotalEmailCount] = useState(0);
  const themeContext = useContext(ThemeContext);
  const darkMode = themeContext?.darkMode || false;
  const toggleTheme = themeContext?.toggleTheme || (() => {});
  
  // Function to handle sort order change
  const handleSortChange = useCallback((e) => {
    setSortOrder(e.target.value);
    // You would need to pass this to your API/fetchEmails function
    // For now, we'll just sort the existing emails client-side
  }, []);
  
  // Function to handle page change
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, [setPage]);
  
  // Function to handle items per page change
  const handleLimitChange = useCallback((e) => {
    setLimit(parseInt(e.target.value, 10));
  }, [setLimit]);
  
  // Function to handle duplicate cleanup
  const [cleanupResult, setCleanupResult] = useState(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const handleCleanupDuplicates = useCallback(async () => {
    if (window.confirm("This will remove duplicate emails from your account. For large numbers of duplicates, this may take a minute. Continue?")) {
      try {
        setIsCleaning(true);
        const result = await cleanupDuplicates();
        if (result.success) {
          setCleanupResult(result);
          // Clear the result after 30 seconds since it's important information
          setTimeout(() => setCleanupResult(null), 30000);
          
          // Refresh total email count
          const fetchTotalEmails = async () => {
            try {
              const axios = require('axios');
              const authToken = localStorage.getItem('authToken');
              if (authToken) {
                const response = await axios.get('http://localhost:5001/api/emails/count', {
                  headers: {
                    'Authorization': `Bearer ${authToken}`
                  }
                });
                
                if (response.data.success) {
                  setTotalEmailCount(response.data.count);
                }
              }
            } catch (error) {
              console.error('Error fetching updated email count:', error);
            }
          };
          
          fetchTotalEmails();
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
        alert('An error occurred during cleanup. Please try again later.');
      } finally {
        setIsCleaning(false);
      }
    }
  }, [cleanupDuplicates]);

  // Fetch the total email count when component mounts
  useEffect(() => {
    const fetchTotalEmails = async () => {
      try {
        // Import axios here to avoid circular dependencies
        const axios = require('axios');
        
        // Create an axios instance with the auth token
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          console.warn('No auth token found for email count API');
          setTotalEmailCount(pagination.total || 0);
          return;
        }
        
        const response = await axios.get('http://localhost:5001/api/emails/count', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (response.data.success) {
          setTotalEmailCount(response.data.count);
        } else {
          // If there's an issue with the API, use pagination total as fallback
          setTotalEmailCount(pagination.total || 0);
        }
      } catch (error) {
        console.error('Error fetching total email count:', error);
        // Use pagination total as fallback
        setTotalEmailCount(pagination.total || 0);
      }
    };
    
    if (currentUser) {
      fetchTotalEmails();
    } else {
      // If no current user, use pagination total
      setTotalEmailCount(pagination.total || 0);
    }
  }, [currentUser, pagination.total]);
  
  // Update email count when pagination changes
  useEffect(() => {
    if (pagination.total) {
      setTotalEmailCount(pagination.total);
    }
  }, [pagination.total]);

  // Loading state
  if (categoriesLoading) {
    return <div className="dashboard-mockup loading">Loading categories...</div>;
  }

  // Calculate unread counts for each category
  const getCategoryUnreadCount = (categoryId) => {
    return emails.filter(
      email => !email.isRead && email.categories.includes(categoryId)
    ).length;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // This year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Earlier years
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="dashboard-mockup">
      <header className="dashboard-header">
        <div className="brand">
          <svg className="logo" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20,4H4C2.9,4,2,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V6C22,4.9,21.1,4,20,4z M20,8l-8,5l-8-5V6l8,5l8-5V8z" />
          </svg>
          <h1>Gmail Categorizer</h1>
          <div className="email-counter" style={{ margin: '0 0 0 10px' }}>
            {totalEmailCount.toLocaleString()} emails
          </div>
        </div>
        <div className="search">
          <div className="search-wrapper" style={{ 
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            <svg 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                width: '18px', 
                height: '18px',
                color: 'var(--light-text)' 
              }} 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search emails..." 
              style={{ paddingLeft: '40px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  navigate(`/search?q=${e.target.value}`);
                }
              }}
            />
          </div>
        </div>
        <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={toggleTheme}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--light-text)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              padding: 0,
            }}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0 c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2 c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1 S11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0 s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06 c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41 c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36 c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36c-0.98,1.37-2.58,2.26-4.4,2.26 c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z" />
              </svg>
            )}
          </button>
          <span style={{ fontWeight: '500' }}>{currentUser?.firstName || 'User'}</span>
          <div 
            className="avatar" 
            onClick={() => navigate('/settings')}
            style={{
              backgroundColor: darkMode ? 'var(--primary-color)' : '#4285f4',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            {currentUser?.firstName?.charAt(0) || 'U'}
          </div>
          <button 
            onClick={logout} 
            className="logout-button"
            style={{
              padding: '6px 12px',
              background: darkMode ? 'rgba(242, 139, 130, 0.18)' : '#ea4335',
              color: darkMode ? '#f28b82' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <aside className="sidebar">
          <button className="compose-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
              <path d="M3,17.25V21h3.75L17.81,9.94l-3.75-3.75L3,17.25z M20.71,7.04c0.39-0.39,0.39-1.02,0-1.41l-2.34-2.34 c-0.39-0.39-1.02-0.39-1.41,0l-1.83,1.83l3.75,3.75L20.71,7.04z" />
            </svg>
            Compose
          </button>
          
          <nav className="categories">
            <div className="categories-header">Categories</div>
            {categories.map(category => {
              const unreadCount = getCategoryUnreadCount(category._id);
              return (
                <div 
                  key={category._id} 
                  className={`category-item ${window.location.pathname === `/category/${category._id}` ? 'active' : ''}`}
                  style={{ borderColor: category.color }}
                  onClick={() => navigate(`/category/${category._id}`)}
                >
                  <div className="category-icon" style={{ backgroundColor: category.color }}>
                    {category.icon === 'inbox' && '📥'}
                    {category.icon === 'people' && '👥'}
                    {category.icon === 'local_offer' && '🏷️'}
                    {category.icon === 'info' && 'ℹ️'}
                    {category.icon === 'forum' && '💬'}
                    {category.icon === 'work' && '💼'}
                    {category.icon === 'flight' && '✈️'}
                  </div>
                  <span className="category-name">{category.name}</span>
                  {unreadCount > 0 && (
                    <span className="unread-count">
                      {unreadCount}
                    </span>
                  )}
                </div>
              );
            })}
          </nav>
          
          <div className="sidebar-footer">
            <Link to="/categories" className="manage-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                <path d="M21.41,11.58l-9-9C12.04,2.21,11.53,2,11,2H4C2.9,2,2,2.9,2,4v7c0,0.53,0.21,1.04,0.59,1.41l9,9 C12.13,21.8,12.84,22,13.5,22s1.37-0.2,1.91-0.59l6-6C22.8,14.13,23,13.4,23,12.66C23,11.93,22.8,11.2,21.41,11.58z M5.5,7 C4.67,7,4,6.33,4,5.5S4.67,4,5.5,4S7,4.67,7,5.5S6.33,7,5.5,7z" />
              </svg>
              Manage Categories
            </Link>
            <Link to="/filters" className="manage-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                <path d="M10,18h4v-2h-4V18z M3,6v2h18V6H3z M6,13h12v-2H6V13z" />
              </svg>
              Manage Filters
            </Link>
            <Link to="/settings" className="settings-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px' }}>
                <path d="M19.43,12.97c0.04-0.32,0.07-0.65,0.07-0.97s-0.03-0.66-0.07-0.97l2.11-1.65c0.19-0.15,0.24-0.42,0.12-0.64l-2-3.46 c-0.12-0.22-0.39-0.3-0.61-0.22l-2.49,1c-0.52-0.4-1.08-0.73-1.69-0.98l-0.38-2.65C14.46,2.18,14.25,2,14,2h-4 C9.75,2,9.54,2.18,9.51,2.42L9.13,5.07C8.52,5.32,7.96,5.66,7.44,6.05l-2.49-1c-0.23-0.09-0.49,0-0.61,0.22l-2,3.46 C2.21,8.95,2.27,9.22,2.46,9.37l2.11,1.65C4.53,11.34,4.5,11.67,4.5,12s0.03,0.66,0.07,0.97l-2.11,1.65 c-0.19,0.15-0.24,0.42-0.12,0.64l2,3.46c0.12,0.22,0.39,0.3,0.61,0.22l2.49-1c0.52,0.4,1.08,0.73,1.69,0.98l0.38,2.65 C9.54,21.82,9.75,22,10,22h4c0.25,0,0.46-0.18,0.49-0.42l0.38-2.65c0.61-0.25,1.17-0.59,1.69-0.98l2.49,1 c0.23,0.09,0.49,0,0.61-0.22l2-3.46c0.12-0.22,0.07-0.49-0.12-0.64L19.43,12.97z M12,15.5c-1.93,0-3.5-1.57-3.5-3.5 s1.57-3.5,3.5-3.5s3.5,1.57,3.5,3.5S13.93,15.5,12,15.5z" />
              </svg>
              Settings
            </Link>
          </div>
        </aside>

        <main className="email-list">
          <div className="email-list-header">
            <h2>
              Inbox
              <div className="email-counter">
                {totalEmailCount > 0 ? totalEmailCount.toLocaleString() : '0'} emails
              </div>
            </h2>
            <div className="list-actions">
              <div style={{ display: 'flex', gap: '5px' }}>
                <button 
                  className="refresh-btn" 
                  onClick={() => fetchNewEmails()}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  {emailsLoading && (
                    <div className="mini-spinner" style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid #fff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  )}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
                    <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4c-4.42,0-7.99,3.58-7.99,8s3.57,8 7.99,8c3.73,0 6.84-2.55 7.73-6h-2.08c-0.82,2.33-3.04,4-5.65,4-3.31,0-6-2.69-6-6s2.69-6 6-6c1.66,0 3.14,0.69 4.22,1.78L13,11h7V4L17.65,6.35z" />
                  </svg>
                  Refresh
                </button>
                <button 
                  onClick={() => {
                    // Confirm with the user since this is a destructive operation
                    if (window.confirm("This will replace ALL emails in the app with the current state from Gmail. This may take a few minutes. Continue?")) {
                      const authToken = localStorage.getItem('authToken');
                      if (authToken) {
                        // Make the API call
                        axios.post('http://localhost:5001/api/emails/sync', {}, {
                          headers: { 'Authorization': `Bearer ${authToken}` }
                        })
                        .then(() => {
                          alert("Full sync started! This process will run in the background and may take several minutes. You'll need to refresh the page after a few minutes to see the updated emails.\n\nNOTE: If you're only seeing a portion of your emails, you may need to disconnect and reconnect your Gmail account with the updated permissions we've added. Please go to Settings and click 'Disconnect Gmail', then reconnect it.");
                        })
                        .catch(error => {
                          console.error('Sync error:', error);
                          alert('Error starting sync: ' + (error.response?.data?.error || 'Unknown error'));
                        });
                      }
                    }
                  }}
                  style={{ 
                    backgroundColor: darkMode ? '#303134' : '#f1f3f4',
                    color: darkMode ? '#8ab4f8' : '#1a73e8',
                    border: darkMode ? '1px solid #5f6368' : 'none',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Sync changes with Gmail"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '4px' }}>
                    <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                  </svg>
                  Sync
                </button>
              </div>
              <button 
                onClick={handleCleanupDuplicates}
                disabled={emailsLoading || isCleaning}
                style={{ 
                  backgroundColor: darkMode ? '#303134' : '#f1f3f4',
                  color: darkMode ? '#8ab4f8' : '#1a73e8',
                  border: darkMode ? '1px solid #5f6368' : 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  marginLeft: '8px',
                  cursor: emailsLoading || isCleaning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  minWidth: '140px',
                  justifyContent: 'center',
                  opacity: emailsLoading || isCleaning ? 0.7 : 1
                }}
              >
                {isCleaning ? (
                  <>
                    <div className="mini-spinner" style={{
                      width: '14px',
                      height: '14px',
                      border: `2px solid ${darkMode ? 'rgba(138, 180, 248, 0.2)' : 'rgba(26, 115, 232, 0.2)'}`,
                      borderTop: `2px solid ${darkMode ? '#8ab4f8' : '#1a73e8'}`,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span style={{ marginLeft: '6px' }}>Cleaning...</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15,16H19V18H15V16M15,8H22V10H15V8M15,12H21V14H15V12M11,10V18H5V10H11M13,8H3V18A2,2 0 0,0 5,20H11A2,2 0 0,0 13,18V8M14,5H11L10,4H6L5,5H2V7H14V5Z" />
                    </svg>
                    Clean Duplicates
                  </>
                )}
              </button>
              <select 
                className="sort-select"
                value={sortOrder}
                onChange={handleSortChange}
                style={{ marginLeft: '8px' }}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
              <select 
                className="limit-select"
                value={pagination.limit}
                onChange={handleLimitChange}
                style={{ marginLeft: '8px' }}
              >
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
                <option value="200">200 per page</option>
              </select>
            </div>
          </div>
          
          {/* Add stats bar with search results info */}
          <div className="email-stats-bar">
            <div>
              Showing {pagination.page > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} - {Math.min(pagination.page * pagination.limit, pagination.total || 0)} of {pagination.total || 0} emails
            </div>
            <div>
              Page {pagination.page} of {pagination.totalPages || 1}
            </div>
          </div>
          
          {/* Show cleanup results notification */}
          {cleanupResult && (
            <div style={{
              padding: '15px',
              margin: '10px 0',
              backgroundColor: darkMode ? '#0f3b43' : '#e8f5e9',
              color: darkMode ? '#81c995' : '#2e7d32',
              borderRadius: '4px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              border: `1px solid ${darkMode ? '#1b5e20' : '#a5d6a7'}`
            }}>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '15px' }}>
                  Duplicate Cleanup Completed
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>{cleanupResult.removedCount}</strong> duplicate emails were removed
                </div>
                <div>
                  Email count reduced from <strong>{cleanupResult.initialCount.toLocaleString()}</strong> to <strong>{cleanupResult.finalCount.toLocaleString()}</strong> 
                  {cleanupResult.removedCount > 0 ? 
                    ` (${((cleanupResult.removedCount / cleanupResult.initialCount) * 100).toFixed(1)}% reduction)` : 
                    ''}
                </div>
                {cleanupResult.removedCount > 500 && (
                  <div style={{ 
                    marginTop: '10px',
                    padding: '8px',
                    backgroundColor: darkMode ? 'rgba(129, 201, 149, 0.1)' : 'rgba(46, 125, 50, 0.08)',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}>
                    <strong>Note:</strong> A large number of duplicates were removed. You may need to refresh the page to see the updated email list.
                  </div>
                )}
              </div>
              <button 
                onClick={() => setCleanupResult(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '16px',
                  cursor: 'pointer',
                  color: darkMode ? '#81c995' : '#2e7d32',
                  padding: '0'
                }}
              >
                ×
              </button>
            </div>
          )}
          
          {/* Background sync indicator */}
          {emailsLoading && (
            <div className="sync-indicator" style={{
              padding: '10px',
              backgroundColor: darkMode ? 'var(--sync-indicator-bg)' : '#e3f2fd',
              borderRadius: '4px',
              margin: '10px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: darkMode ? '#e8eaed' : 'inherit',
              border: darkMode ? '1px solid #3c4043' : 'none',
              boxShadow: darkMode ? '0 1px 2px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div className="sync-spinner" style={{
                width: '18px',
                height: '18px',
                border: `3px solid ${darkMode ? '#3c4043' : '#bbdefb'}`,
                borderTop: `3px solid ${darkMode ? '#8ab4f8' : '#2196f3'}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span style={{ flex: 1 }}>
                <strong style={{ color: darkMode ? '#8ab4f8' : '#1976d2' }}>
                  Historical email sync in progress...
                </strong>{' '}
                <span style={{ color: darkMode ? '#e8eaed' : 'inherit' }}>
                  Emails will appear as they are loaded. You can continue using the app.
                </span>
              </span>
            </div>
          )}
          
          {/* Show warning about metadata-only emails if any exist */}
          {emails.some(email => email.metadata?.isMetadataOnly) && (
            <div style={{ 
              marginTop: '10px',
              marginBottom: '15px',
              padding: '12px',
              backgroundColor: darkMode ? 'rgba(251, 188, 5, 0.15)' : '#fff8e1',
              border: `1px solid ${darkMode ? '#fb8c00' : '#ffe082'}`,
              borderRadius: '4px',
              fontSize: '14px',
              color: darkMode ? '#fbcb65' : '#b07800'
            }}>
              <div style={{ 
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{ marginTop: '2px', color: darkMode ? '#fbcb65' : '#f57c00', fontWeight: 'bold' }}>⚠️</div>
                <div>
                  <p style={{ fontWeight: 'bold', marginTop: 0, marginBottom: '8px' }}>
                    Limited Permission Access
                  </p>
                  <p style={{ margin: '0 0 8px 0' }}>
                    Some emails are showing with limited content due to Gmail API permission restrictions. 
                    These emails are marked with a <span style={{ 
                      display: 'inline-block',
                      padding: '2px 5px',
                      backgroundColor: darkMode ? '#5f6368' : '#e0e0e0', 
                      color: darkMode ? '#e8eaed' : '#5f6368',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      marginLeft: '4px',
                      marginRight: '4px'
                    }}>Limited</span> badge.
                  </p>
                  <p style={{ margin: '0' }}>
                    To see full email content, please go to <strong>Settings</strong> → <strong>Gmail Integration</strong> → click <strong>Disconnect</strong> and reconnect your account.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {emailsLoading ? (
            <div className="loading-container" style={{ 
              padding: '40px', 
              textAlign: 'center',
              color: darkMode ? '#e8eaed' : '#555'
            }}>
              <p>Loading emails...</p>
              <div className="spinner" style={{
                width: '40px',
                height: '40px',
                margin: '20px auto',
                border: `4px solid ${darkMode ? '#3c4043' : '#f3f3f3'}`,
                borderTop: `4px solid ${darkMode ? '#8ab4f8' : '#3498db'}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : emails.length === 0 ? (
            <div className="no-emails" style={{ 
              padding: '40px', 
              textAlign: 'center',
              color: darkMode ? '#e8eaed' : '#555',
              backgroundColor: darkMode ? 'var(--email-item-bg)' : 'transparent',
              border: darkMode ? '1px solid var(--border-color)' : 'none',
              borderRadius: '8px',
              marginTop: '10px'
            }}>
              <p>No emails found</p>
              <button 
                onClick={() => fetchNewEmails(true)} 
                className="sync-historical-btn"
                style={{
                  backgroundColor: darkMode ? 'rgba(138, 180, 248, 0.2)' : '#2196F3',
                  color: darkMode ? '#8ab4f8' : 'white',
                  padding: '10px 15px',
                  border: darkMode ? '1px solid #8ab4f8' : 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '15px'
                }}
              >
                Sync Historical Emails
              </button>
            </div>
          ) : (
            <>
              <div className="emails">
                {emails.map(email => (
                  <div key={email._id} className={`email-item ${!email.isRead ? 'unread' : ''}`}>
                    <div className="email-checkbox">
                      <input type="checkbox" />
                    </div>
                    <div className="email-star">
                      {email.isStarred ? '⭐' : '☆'}
                    </div>
                    <div className="email-from">{email.from.name || email.from.email}</div>
                    <div className="email-content">
                      <div className="email-subject">{email.subject}</div>
                      <div className="email-preview">
                        {email.metadata?.isMetadataOnly 
                        ? <span style={{ color: darkMode ? '#9aa0a6' : '#80868b', fontStyle: 'italic' }}>[Limited access - metadata only] {email.body.text.substring(0, 40) + '...'}</span> 
                        : (email.body.text ? email.body.text.substring(0, 60) + '...' : '(No content)')}
                      </div>
                    </div>
                    <div className="email-meta">
                      {email.metadata?.hasAttachments && <span className="attachment-icon">📎</span>}
                      {email.metadata?.isMetadataOnly && (
                        <span 
                          className="metadata-badge" 
                          title="This email has limited content access due to permission restrictions"
                          style={{
                            backgroundColor: darkMode ? '#5f6368' : '#e0e0e0',
                            color: darkMode ? '#e8eaed' : '#5f6368',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            marginRight: '5px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}
                        >
                          Limited
                        </span>
                      )}
                      <div className="email-time">{formatTime(email.receivedAt)}</div>
                      <div className="email-categories">
                        {email.categories.map(categoryId => {
                          const category = categories.find(c => c._id === categoryId);
                          return category ? (
                            <span 
                              key={categoryId}
                              className="email-category"
                              style={{ backgroundColor: category.color }}
                            >
                              {category.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination controls */}
              {pagination.totalPages > 1 && (
                <div className="pagination-controls" style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: '20px',
                  padding: '10px'
                }}>
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1}
                    style={{
                      padding: '5px 10px',
                      marginRight: '5px',
                      cursor: pagination.page === 1 ? 'default' : 'pointer',
                      opacity: pagination.page === 1 ? 0.5 : 1,
                      backgroundColor: darkMode ? '#303134' : '#f1f3f4',
                      color: darkMode ? '#e8eaed' : '#202124',
                      border: darkMode ? '1px solid #5f6368' : '1px solid #dadce0',
                      borderRadius: '4px'
                    }}
                  >
                    &laquo; First
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    style={{
                      padding: '5px 10px',
                      marginRight: '5px',
                      cursor: pagination.page === 1 ? 'default' : 'pointer',
                      opacity: pagination.page === 1 ? 0.5 : 1,
                      backgroundColor: darkMode ? '#303134' : '#f1f3f4',
                      color: darkMode ? '#e8eaed' : '#202124',
                      border: darkMode ? '1px solid #5f6368' : '1px solid #dadce0',
                      borderRadius: '4px'
                    }}
                  >
                    &lt; Previous
                  </button>
                  
                  <span style={{ 
                    margin: '0 15px',
                    color: darkMode ? '#e8eaed' : '#202124'
                  }}>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    style={{
                      padding: '5px 10px',
                      marginLeft: '5px',
                      cursor: pagination.page === pagination.totalPages ? 'default' : 'pointer',
                      opacity: pagination.page === pagination.totalPages ? 0.5 : 1,
                      backgroundColor: darkMode ? '#303134' : '#f1f3f4',
                      color: darkMode ? '#e8eaed' : '#202124',
                      border: darkMode ? '1px solid #5f6368' : '1px solid #dadce0',
                      borderRadius: '4px'
                    }}
                  >
                    Next &gt;
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.page === pagination.totalPages}
                    style={{
                      padding: '5px 10px',
                      marginLeft: '5px',
                      cursor: pagination.page === pagination.totalPages ? 'default' : 'pointer',
                      opacity: pagination.page === pagination.totalPages ? 0.5 : 1,
                      backgroundColor: darkMode ? '#303134' : '#f1f3f4',
                      color: darkMode ? '#e8eaed' : '#202124',
                      border: darkMode ? '1px solid #5f6368' : '1px solid #dadce0',
                      borderRadius: '4px'
                    }}
                  >
                    Last &raquo;
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;