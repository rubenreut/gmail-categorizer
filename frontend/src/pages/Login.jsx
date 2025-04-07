import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  
  const { login, error } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for error parameters in the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    
    if (errorParam) {
      console.error('Login error from URL:', errorParam);
      setLocalError(`Google login failed: ${errorParam}`);
      
      // Clear the URL parameter
      navigate('/login', { replace: true });
    }
  }, [location, navigate]);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Use entered credentials
    const success = await login(formData.email, formData.password);
    
    if (success) {
      navigate('/');
    }
    
    setLoading(false);
  };
  
  return (
    <div className="login-page">
      <div className="login-container">
        <div className="logo">
          <svg width="48" height="48" viewBox="0 0 24 24">
            <path d="M20,4H4C2.9,4,2,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V6C22,4.9,21.1,4,20,4z M20,8l-8,5l-8-5V6l8,5l8-5V8z" fill="#4285f4"/>
          </svg>
          <h1>Gmail Categorizer</h1>
        </div>
        
        <h2>Sign in</h2>
        
        {(error || localError) && (
          <div className="error-message">
            {error || localError}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        
        <div className="register-link">
          <p>
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>

        {/* Login options */}
        <div className="login-options">
          <div className="google-login">
            <button 
              onClick={async () => {
                try {
                  setLoading(true);
                  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
                  const response = await axios.get(`${API_URL}/api/auth/google`);
                  if (response.data.success) {
                    window.location.href = response.data.data.authUrl;
                  } else {
                    setLocalError('Failed to generate Google auth URL');
                  }
                } catch (error) {
                  console.error('Error getting Google auth URL:', error);
                  setLocalError('Failed to connect to Google');
                } finally {
                  setLoading(false);
                }
              }}
              className="google-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                color: '#444',
                fontWeight: 'bold',
                cursor: 'pointer',
                margin: '10px 0'
              }}
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ marginRight: '10px' }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Sign in with Google
            </button>
          </div>
          
          <div className="demo-login">
            <p>Or <button 
              onClick={async () => {
                setLoading(true);
                const success = await login('demo@example.com', 'password123');
                if (success) navigate('/');
                setLoading(false);
              }}
              className="demo-button"
              style={{
                backgroundColor: '#4285F4',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Try Demo Account
            </button></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;