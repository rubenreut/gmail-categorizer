import React, { useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleGoogleLogin } = useContext(AuthContext);
  
  useEffect(() => {
    console.log("GoogleCallback component mounted");
    console.log("Current URL:", window.location.href);
    
    const handleGoogleCallback = async () => {
      console.log("Handling Google callback");
      try {
        // Get token from URL
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const error = params.get('error');
        
        console.log("URL params:", { 
          hasToken: !!token, 
          tokenLength: token?.length || 0,
          error: error || 'none'
        });
        
        if (error) {
          console.error('Google authentication error:', error);
          navigate('/login?error=google_auth_failed');
          return;
        }
        
        // Check if we're getting an error message directly
        if (location.pathname === '/api/auth/google/callback') {
          console.error('Received direct callback with error. Will redirect to login page.');
          navigate('/login?error=google_auth_failed');
          return;
        }
        
        if (!token) {
          console.error('No token received from Google auth');
          navigate('/login?error=no_token');
          return;
        }
        
        console.log("About to call handleGoogleLogin with token");
        
        // Use our new handler function in AuthContext
        const success = await handleGoogleLogin(token);
        
        console.log("handleGoogleLogin result:", success);
        
        if (success) {
          console.log("Login successful, redirecting to dashboard");
          // Redirect to dashboard on success
          navigate('/');
        } else {
          console.log("Login failed, redirecting to login page");
          // Redirect to login on failure
          navigate('/login?error=auth_failed');
        }
      } catch (error) {
        console.error('Error handling Google callback:', error);
        navigate('/login?error=callback_error');
      }
    };
    
    handleGoogleCallback();
  }, [navigate, location, handleGoogleLogin]);
  
  return (
    <div className="google-callback">
      <div className="loading-spinner">
        <svg className="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
          <circle className="path" fill="none" strokeWidth="6" strokeLinecap="round" cx="33" cy="33" r="30"></circle>
        </svg>
      </div>
      <p>Logging you in with Google...</p>
    </div>
  );
};

export default GoogleCallback;