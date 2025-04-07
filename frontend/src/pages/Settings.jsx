import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import GmailIntegration from '../components/settings/GmailIntegration';

const Settings = () => {
  const { currentUser, updateProfile } = useContext(AuthContext);
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  
  const [profileForm, setProfileForm] = useState({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || ''
  });
  
  const [preferencesForm, setPreferencesForm] = useState({
    theme: darkMode ? 'dark' : 'light',
    emailsPerPage: 20,
    categorization: {
      applyAutomatically: true,
      mlSuggestions: true
    },
    notifications: {
      enabled: true,
      emailDigest: false
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  const handleProfileChange = (e) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value
    });
  };
  
  const handlePreferencesChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      // Handle nested properties for checkboxes
      if (name.includes('.')) {
        const [category, setting] = name.split('.');
        setPreferencesForm({
          ...preferencesForm,
          [category]: {
            ...preferencesForm[category],
            [setting]: checked
          }
        });
      } else {
        setPreferencesForm({
          ...preferencesForm,
          [name]: checked
        });
      }
    } else {
      setPreferencesForm({
        ...preferencesForm,
        [name]: value
      });
    }
  };
  
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const success = await updateProfile(profileForm);
    
    if (success) {
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } else {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    }
    
    setLoading(false);
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };
  
  const handleThemeChange = () => {
    const newTheme = darkMode ? 'light' : 'dark';
    setPreferencesForm({
      ...preferencesForm,
      theme: newTheme
    });
    toggleTheme();
  };
  
  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1>Settings</h1>
      </header>
      
      <div className="settings-content">
        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        
        <div className="settings-section">
          <h2>Profile</h2>
          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={profileForm.firstName}
                onChange={handleProfileChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={profileForm.lastName}
                onChange={handleProfileChange}
                required
              />
            </div>
            
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
        
        <div className="settings-section">
          <h2>Preferences</h2>
          <div className="preferences-form">
            <div className="form-group">
              <label htmlFor="theme">Theme</label>
              <div className="theme-toggle">
                <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
                <button 
                  type="button" 
                  className="theme-button"
                  onClick={handleThemeChange}
                >
                  {darkMode ? 'Switch to Light' : 'Switch to Dark'}
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="emailsPerPage">Emails Per Page</label>
              <select
                id="emailsPerPage"
                name="emailsPerPage"
                value={preferencesForm.emailsPerPage}
                onChange={handlePreferencesChange}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            
            <div className="form-group checkbox-group">
              <h3>Categorization</h3>
              
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="applyAutomatically"
                  name="categorization.applyAutomatically"
                  checked={preferencesForm.categorization.applyAutomatically}
                  onChange={handlePreferencesChange}
                />
                <label htmlFor="applyAutomatically">
                  Apply categories automatically
                </label>
              </div>
              
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="mlSuggestions"
                  name="categorization.mlSuggestions"
                  checked={preferencesForm.categorization.mlSuggestions}
                  onChange={handlePreferencesChange}
                />
                <label htmlFor="mlSuggestions">
                  Show category suggestions from AI
                </label>
              </div>
            </div>
            
            <div className="form-group checkbox-group">
              <h3>Notifications</h3>
              
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="notificationsEnabled"
                  name="notifications.enabled"
                  checked={preferencesForm.notifications.enabled}
                  onChange={handlePreferencesChange}
                />
                <label htmlFor="notificationsEnabled">
                  Enable notifications
                </label>
              </div>
              
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="emailDigest"
                  name="notifications.emailDigest"
                  checked={preferencesForm.notifications.emailDigest}
                  onChange={handlePreferencesChange}
                  disabled={!preferencesForm.notifications.enabled}
                />
                <label htmlFor="emailDigest">
                  Receive daily email digest
                </label>
              </div>
            </div>
            
            <button type="button" className="save-button">
              Save Preferences
            </button>
          </div>
        </div>
        
        <div className="settings-section">
          <GmailIntegration />
        </div>
      </div>
    </div>
  );
};

export default Settings;