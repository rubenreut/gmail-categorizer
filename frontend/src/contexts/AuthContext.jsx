import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    
    if (token) {
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get user details
      getUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const getUserProfile = async () => {
    console.log("getUserProfile: Fetching user profile");
    try {
      console.log("getUserProfile: Making API call to /api/users/me");
      console.log("getUserProfile: Headers:", axios.defaults.headers.common);
      
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.get(`${API_URL}/api/users/me`);
      
      console.log("getUserProfile: Response received:", response.data);
      setCurrentUser(response.data.data);
      setLoading(false);
      console.log("getUserProfile: Current user set");
      return response.data.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      
      logout(); // Clear invalid token
      setLoading(false);
      throw error; // Re-throw for handleGoogleLogin to catch
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });
      
      const { token, data } = response.data;
      
      localStorage.setItem('authToken', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setCurrentUser(data);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Login failed');
      return false;
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.post(`${API_URL}/api/auth/register`, userData);
      
      const { token, data } = response.data;
      
      localStorage.setItem('authToken', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setCurrentUser(data);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.error || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  const updateProfile = async (userData) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const response = await axios.put(`${API_URL}/api/users/me`, userData);
      setCurrentUser(response.data.data);
      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      setError(error.response?.data?.error || 'Failed to update profile');
      return false;
    }
  };

  // Add a new function for handling Google sign-in
  const handleGoogleLogin = async (token) => {
    console.log("AuthContext: handleGoogleLogin called with token length:", token?.length || 0);
    try {
      setError(null);
      
      // Set token in localStorage
      localStorage.setItem('authToken', token);
      console.log("AuthContext: Token stored in localStorage");
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log("AuthContext: Axios headers set");
      
      // Fetch user profile using the token
      console.log("AuthContext: About to fetch user profile");
      await getUserProfile();
      console.log("AuthContext: User profile fetched successfully");
      
      return true;
    } catch (error) {
      console.error('Google login error:', error);
      console.error('Response data:', error.response?.data);
      setError(error.response?.data?.error || 'Google login failed');
      logout(); // Clear token on error
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        handleGoogleLogin,
        getUserProfile  // Export this for GoogleCallback
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};