import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EmailProvider } from './contexts/EmailContext';
import { CategoryProvider } from './contexts/CategoryContext';
import { FilterProvider } from './contexts/FilterContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import CategoryView from './pages/CategoryView';
import Settings from './pages/Settings';
import FilterManagement from './pages/FilterManagement';
import CategoryManagement from './pages/CategoryManagement';
import Search from './pages/Search';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import GoogleCallback from './pages/GoogleCallback';

// Auth Guard Component
const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('authToken') !== null;
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AppRouter = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<GoogleCallback />} />
            
            <Route 
              path="/" 
              element={
                <PrivateRoute>
                  <EmailProvider>
                    <CategoryProvider>
                      <FilterProvider>
                        <Dashboard />
                      </FilterProvider>
                    </CategoryProvider>
                  </EmailProvider>
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/inbox" 
              element={
                <PrivateRoute>
                  <EmailProvider>
                    <CategoryProvider>
                      <FilterProvider>
                        <Inbox />
                      </FilterProvider>
                    </CategoryProvider>
                  </EmailProvider>
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/category/:categoryId" 
              element={
                <PrivateRoute>
                  <EmailProvider>
                    <CategoryProvider>
                      <FilterProvider>
                        <CategoryView />
                      </FilterProvider>
                    </CategoryProvider>
                  </EmailProvider>
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/search" 
              element={
                <PrivateRoute>
                  <EmailProvider>
                    <CategoryProvider>
                      <FilterProvider>
                        <Search />
                      </FilterProvider>
                    </CategoryProvider>
                  </EmailProvider>
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/settings" 
              element={
                <PrivateRoute>
                  <EmailProvider>
                    <CategoryProvider>
                      <FilterProvider>
                        <Settings />
                      </FilterProvider>
                    </CategoryProvider>
                  </EmailProvider>
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/filters" 
              element={
                <PrivateRoute>
                  <EmailProvider>
                    <CategoryProvider>
                      <FilterProvider>
                        <FilterManagement />
                      </FilterProvider>
                    </CategoryProvider>
                  </EmailProvider>
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/categories" 
              element={
                <PrivateRoute>
                  <EmailProvider>
                    <CategoryProvider>
                      <FilterProvider>
                        <CategoryManagement />
                      </FilterProvider>
                    </CategoryProvider>
                  </EmailProvider>
                </PrivateRoute>
              } 
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default AppRouter;
