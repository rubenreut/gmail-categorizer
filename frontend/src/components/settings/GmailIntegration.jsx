import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { EmailContext } from '../../contexts/EmailContext';

// Shared API URL constant
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const GmailIntegration = () => {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ syncing: false, lastSync: null });
  const [syncInterval, setSyncInterval] = useState(15); // default 15 minutes
  
  const { currentUser } = useContext(AuthContext);
  const { fetchNewEmails } = useContext(EmailContext);
  
  // Define handleFetchEmails
  const handleFetchEmails = async (fullSync = false) => {
    try {
      setLoading(true);
      setError(null);
      setSyncStatus({ ...syncStatus, syncing: true });
      
      // Call the fetchNewEmails from EmailContext with fullSync parameter
      const emailResult = await fetchNewEmails(fullSync);
      
      if (emailResult.success) {
        // Update last sync time
        setSyncStatus({
          syncing: false,
          lastSync: new Date()
        });
      } else {
        setError(emailResult.error || 'Failed to fetch emails');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching emails:', error);
      setError('Failed to fetch emails from Gmail');
      setLoading(false);
      setSyncStatus({ ...syncStatus, syncing: false });
    }
  };
  
  // Define checkGmailStatus
  const checkGmailStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Checking Gmail status...');
      // Use the shared API URL constant
      // Add a timestamp to avoid caching
      const response = await axios.get(`${API_URL}/api/gmail/status?t=${Date.now()}`);
      console.log('Gmail status response:', response.data);
      
      // Update connection status
      const isConnected = response.data.data.connected;
      console.log('Connection status from API:', isConnected);
      setConnected(isConnected);
      
      if (response.data.data.email) {
        setEmail(response.data.data.email);
        console.log('Email from API:', response.data.data.email);
      } else {
        console.log('No email in response');
      }
      
      // Set sync interval if provided
      if (response.data.data.syncInterval) {
        setSyncInterval(response.data.data.syncInterval);
      }
      
      // If we have lastSync information
      if (response.data.data.lastSync) {
        setSyncStatus({
          syncing: false,
          lastSync: new Date(response.data.data.lastSync)
        });
        console.log('Last sync time updated:', response.data.data.lastSync);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError('Failed to check Gmail connection status');
      setLoading(false);
    }
  };
  
  // Initial setup and handle Gmail connected parameter
  useEffect(() => {
    console.log('Initializing GmailIntegration component');
    checkGmailStatus();
    
    // Get the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const gmailConnected = urlParams.get('gmailConnected');
    console.log('gmailConnected URL param:', gmailConnected);
    
    // If the URL contains the gmailConnected parameter, show success message
    if (gmailConnected === 'true') {
      console.log('Gmail connected parameter detected, showing success message');
      
      // Clear the URL parameter without reloading the page
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Show success message
      setSyncStatus({ syncing: false, lastSync: new Date() });
      setError(null);
      
      // Show notification about successful reconnection with updated permissions
      const notification = document.createElement('div');
      notification.style.position = 'fixed';
      notification.style.top = '20px';
      notification.style.right = '20px';
      notification.style.padding = '15px 20px';
      notification.style.backgroundColor = '#4caf50';
      notification.style.color = 'white';
      notification.style.borderRadius = '4px';
      notification.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
      notification.style.zIndex = '9999';
      notification.style.maxWidth = '400px';
      notification.style.fontWeight = 'bold';
      notification.style.fontSize = '14px';
      notification.innerHTML = `
        <div style="display: flex; align-items: center;">
          <div style="margin-right: 15px; font-size: 24px;">✅</div>
          <div>
            <div style="margin-bottom: 5px; font-weight: bold;">Gmail Connected Successfully!</div>
            <div style="font-weight: normal; font-size: 13px;">Your account has been reconnected with the updated permissions. Click "Sync ALL Emails" to fetch your complete email history.</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Remove the notification after 10 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 10000);
      
      // Refresh the Gmail status and reload page
      setTimeout(() => {
        console.log('Reloading page to reflect updated connection status');
        window.location.reload();
      }, 2000);
    }
  }, []);
  
  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simple direct URL approach for testing
      const directUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(process.env.REACT_APP_GOOGLE_CLIENT_ID || '')}&redirect_uri=${encodeURIComponent(`${API_URL}/api/gmail/callback`)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.metadata https://www.googleapis.com/auth/gmail.readonly https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}&access_type=offline&prompt=consent`;
      
      // For testing, use a direct OAuth URL to bypass any backend issues
      if (directUrl && process.env.REACT_APP_GOOGLE_CLIENT_ID) {
        console.log('Using direct OAuth URL with client ID:', process.env.REACT_APP_GOOGLE_CLIENT_ID?.substring(0, 5) + '...');
        window.location.href = directUrl;
        return;
      }
      
      // Otherwise, use the backend route
      console.log('Getting auth URL from backend...');
      const response = await axios.get(`${API_URL}/api/gmail/auth-url`);
      console.log('Got auth URL:', response.data.data.authUrl.substring(0, 50) + '...');
      
      // Redirect to Google OAuth page
      window.location.href = response.data.data.authUrl;
    } catch (error) {
      console.error('Error getting Gmail auth URL:', error);
      setError('Failed to initiate Gmail connection');
      setLoading(false);
      
      // Show detailed error for troubleshooting
      alert('Connection error: ' + (error.response?.data?.error || error.message));
    }
  };
  
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the disconnect endpoint
      await axios.post(`${API_URL}/api/gmail/disconnect`);
      
      setConnected(false);
      setEmail('');
      setSyncStatus({ syncing: false, lastSync: null });
      setLoading(false);
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      setError('Failed to disconnect Gmail');
      setLoading(false);
    }
  };
  
  const handleResetTokens = async () => {
    try {
      if (!window.confirm('This will reset your Gmail connection for troubleshooting. You will need to reconnect afterward. Continue?')) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      // Call the reset tokens endpoint
      await axios.post(`${API_URL}/api/gmail/reset-tokens`);
      
      setConnected(false);
      setEmail('');
      setSyncStatus({ syncing: false, lastSync: null });
      
      // Show notification
      alert('Gmail tokens have been reset. Please click "Connect Gmail Account" to reconnect with full permissions.');
      
      setLoading(false);
    } catch (error) {
      console.error('Error resetting Gmail tokens:', error);
      setError('Failed to reset Gmail tokens');
      setLoading(false);
    }
  };
  
  const handleTestConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the test connection endpoint
      const response = await axios.post(`${API_URL}/api/gmail/test-connection`);
      console.log('Test connection response:', response.data);
      
      // Show test results in alert
      if (response.data.connected) {
        alert(`Gmail connection test SUCCESSFUL!\n\nConnected as: ${response.data.profileData?.emailAddress}\nTotal messages: ${response.data.profileData?.messagesTotal}\nLabels accessible: ${response.data.labelTest?.labelsAccessible}`);
      } else {
        alert(`Gmail connection test FAILED!\n\nReason: ${response.data.message}\n\nPlease disconnect and reconnect your account.`);
      }
      
      // Update connection status based on test
      setConnected(response.data.connected);
      if (response.data.profileData?.emailAddress) {
        setEmail(response.data.profileData.emailAddress);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error testing Gmail connection:', error);
      setError('Failed to test Gmail connection');
      setLoading(false);
      alert('Error testing Gmail connection. See console for details.');
    }
  };
  
  const handleSyncIntervalChange = async (e) => {
    const value = parseInt(e.target.value, 10);
    setSyncInterval(value);
    
    try {
      // Call API to update sync interval
      await axios.post(`${API_URL}/api/gmail/sync-interval`, { 
        interval: value 
      });
    } catch (error) {
      console.error('Error updating sync interval:', error);
      // Continue with UI update even if API call fails
    }
  };
  
  const formatSyncTime = (date) => {
    if (!date) return 'Never';
    
    // Format date to local string with time
    return date.toLocaleString();
  };
  
  if (loading && !syncStatus.syncing) {
    return <div className="gmail-integration loading">Loading...</div>;
  }
  
  return (
    <div className="gmail-integration">
      <h2>Gmail Integration</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {connected ? (
        <div className="connection-status connected">
          <div className="connection-header">
            <div className="connection-info">
              <p>
                Connected to Gmail with account: <strong>{email}</strong>
              </p>
              <p className="sync-status">
                {syncStatus.syncing ? (
                  <span className="syncing">Syncing emails...</span>
                ) : (
                  <span>Last synced: {formatSyncTime(syncStatus.lastSync)}</span>
                )}
              </p>
            </div>
            <div className="connection-badge">
              <span className="connected-badge">Connected</span>
            </div>
          </div>
          
          <div className="sync-settings">
            <div className="form-group">
              <label htmlFor="syncInterval">Auto-sync interval:</label>
              <select 
                id="syncInterval" 
                value={syncInterval}
                onChange={handleSyncIntervalChange}
                disabled={syncStatus.syncing}
              >
                <option value="5">Every 5 minutes</option>
                <option value="15">Every 15 minutes</option>
                <option value="30">Every 30 minutes</option>
                <option value="60">Every hour</option>
                <option value="0">Manual only</option>
              </select>
            </div>
          </div>
          
          <div className="gmail-actions">
            <button 
              onClick={() => handleFetchEmails(false)} 
              className="fetch-button"
              disabled={syncStatus.syncing}
            >
              {syncStatus.syncing ? (
                <span>Syncing...</span>
              ) : (
                <span>Sync Recent Emails</span>
              )}
            </button>
            <button 
              onClick={() => handleFetchEmails(true)} 
              className="fetch-historical-button"
              disabled={syncStatus.syncing}
              style={{
                backgroundColor: '#2196F3',
                color: 'white',
                padding: '10px 15px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: '10px'
              }}
            >
              {syncStatus.syncing ? (
                <span>Syncing...</span>
              ) : (
                <span>Sync ALL Emails (Complete Account History)</span>
              )}
            </button>
            <button 
              onClick={handleDisconnect} 
              className="disconnect-button"
              disabled={syncStatus.syncing}
              style={{ marginLeft: '10px' }}
            >
              Disconnect
            </button>
          </div>
          <div className="sync-info" style={{ 
            marginTop: '15px', 
            fontSize: '0.9em', 
            padding: '10px',
            border: '1px solid #eee',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9' 
          }}>
            <p>
              <strong>Sync Recent Emails:</strong> Fetches new emails since last sync
            </p>
            <p>
              <strong>Sync ALL Historical Emails:</strong> Complete sync of ALL emails in your account, no matter how many
            </p>
            
            <div style={{ marginTop: '10px', backgroundColor: '#ffebee', padding: '12px', borderRadius: '4px', border: '1px solid #ef9a9a' }}>
              <p style={{ marginBottom: '8px', fontWeight: 'bold', color: '#c62828' }}>⚠️ IMPORTANT: Permission Update Required</p>
              <p style={{ marginBottom: '8px' }}>
                We've enhanced the app to fetch <strong>ALL</strong> of your emails, but this requires updated permissions.
              </p>
              <p style={{ marginBottom: '8px' }}>
                Currently, you may see <strong>"Metadata scope doesn't allow format FULL"</strong> errors. This means we can only 
                access limited email information (subject, sender, date) but not the full content.
              </p>
              <p style={{ fontWeight: 'bold' }}>
                Please click "Disconnect" below, then reconnect your Gmail account to grant full permissions and access all your emails.
              </p>
              <div style={{ 
                marginTop: '12px', 
                padding: '8px 12px', 
                backgroundColor: '#b71c1c', 
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <p style={{ margin: 0, color: 'white', fontWeight: 'bold', flex: '1 1 100%' }}>
                  Troubleshooting: If disconnect/reconnect isn't working, try these options
                </p>
                <div style={{ display: 'flex', gap: '8px', flex: '1 1 100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      try {
                        console.log('Manual status check requested');
                        checkGmailStatus();
                        setTimeout(() => alert('Connection status: ' + (connected ? 'Connected' : 'Not connected')), 500);
                      } catch (err) {
                        console.error('Error checking status:', err);
                        alert('Error checking status: ' + err.message);
                      }
                    }}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      color: '#b71c1c',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flex: '1'
                    }}
                  >
                    Check Status
                  </button>
                  <button
                    onClick={handleTestConnection}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      color: '#b71c1c',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flex: '1'
                    }}
                  >
                    Test Connection
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      color: '#b71c1c',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flex: '1'
                    }}
                  >
                    Refresh Page
                  </button>
                  <button
                    onClick={handleResetTokens}
                    style={{
                      backgroundColor: 'white',
                      color: '#b71c1c',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flex: '1'
                    }}
                  >
                    Reset Connection
                  </button>
                </div>
              </div>
              <p style={{ marginTop: '8px', fontSize: '0.9em', fontStyle: 'italic' }}>
                Note: Even with limited permissions, we can still sync and categorize your emails (with limited accuracy). Full permissions 
                will provide the best experience with accurate categorization.
              </p>
            </div>
            
            <div style={{ marginTop: '10px', backgroundColor: '#fff8e1', padding: '10px', borderRadius: '4px', border: '1px solid #ffe082' }}>
              <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>Important Notes for Full Historical Sync:</p>
              <ul style={{ margin: '0 0 0 20px', padding: 0 }}>
                <li>This operation fetches ALL of your emails, even from before you created an account</li>
                <li>The process runs in batches and may take 15-30+ minutes for large accounts</li>
                <li>You can continue using the app while sync runs in the background</li>
                <li>Emails will appear gradually as they are processed</li>
                <li>Use the "Refresh" button to check if new emails have been loaded</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="connection-status not-connected">
          <div className="connection-header">
            <p>Not connected to Gmail</p>
            <div className="connection-badge">
              <span className="disconnected-badge">Disconnected</span>
            </div>
          </div>
          <p className="connection-help">
            Connect your Gmail account to automatically categorize your emails.
          </p>
          <button onClick={handleConnect} className="connect-button">
            Connect Gmail Account
          </button>
        </div>
      )}
      
      <div className="integration-info">
        <h3>About Gmail Integration</h3>
        <p>
          Connecting your Gmail account allows the app to:
        </p>
        <ul>
          <li>Read your emails (content is never stored permanently)</li>
          <li>Categorize emails automatically using AI</li>
          <li>Apply your custom filters to organize your inbox</li>
        </ul>
        <p>
          <strong>Note:</strong> We do not modify or delete your emails, and your account can be disconnected at any time.
        </p>
        
        <div className="privacy-info">
          <h4>Privacy & Security</h4>
          <p>
            Your privacy is important to us. We request access to your emails for categorization.
            We never store your full email content on our servers - only the metadata needed
            for categorization and organization. The app now has expanded permissions to ensure
            it can access ALL of your emails, including historical ones.
          </p>
          <p>
            Your Google account credentials are never seen or stored by our application.
            Authentication is handled securely through Google's OAuth 2.0 protocol.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GmailIntegration;