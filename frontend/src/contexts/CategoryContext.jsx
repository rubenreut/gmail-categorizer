import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const CategoryContext = createContext();

export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    if (currentUser) {
      fetchCategories();
    }
  }, [currentUser]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('http://localhost:5001/api/categories');
      setCategories(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories');
      setLoading(false);
      
      // For demo, set mock categories if the API fails
      setCategories([
        { _id: 'cat1', name: 'Primary', color: '#4285f4', icon: 'inbox', isSystem: true },
        { _id: 'cat2', name: 'Social', color: '#ea4335', icon: 'people', isSystem: true },
        { _id: 'cat3', name: 'Promotions', color: '#34a853', icon: 'local_offer', isSystem: true },
        { _id: 'cat4', name: 'Updates', color: '#fbbc04', icon: 'info', isSystem: true },
        { _id: 'cat5', name: 'Work', color: '#0097a7', icon: 'work', isSystem: false },
        { _id: 'cat6', name: 'Travel', color: '#f06292', icon: 'flight', isSystem: false },
      ]);
    }
  };

  const getCategory = (categoryId) => {
    return categories.find(category => category._id === categoryId);
  };

  const createCategory = async (categoryData) => {
    try {
      setError(null);
      const response = await axios.post('http://localhost:5000/api/categories', categoryData);
      
      setCategories([...categories, response.data.data]);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error creating category:', error);
      setError(error.response?.data?.error || 'Failed to create category');
      return { success: false, error: error.response?.data?.error || 'Failed to create category' };
    }
  };

  const updateCategory = async (categoryId, categoryData) => {
    try {
      setError(null);
      const response = await axios.put(`http://localhost:5000/api/categories/${categoryId}`, categoryData);
      
      setCategories(categories.map(category => 
        category._id === categoryId ? response.data.data : category
      ));
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error updating category:', error);
      setError(error.response?.data?.error || 'Failed to update category');
      return { success: false, error: error.response?.data?.error || 'Failed to update category' };
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      setError(null);
      await axios.delete(`http://localhost:5000/api/categories/${categoryId}`);
      
      setCategories(categories.filter(category => category._id !== categoryId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting category:', error);
      setError(error.response?.data?.error || 'Failed to delete category');
      return { success: false, error: error.response?.data?.error || 'Failed to delete category' };
    }
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        loading,
        error,
        fetchCategories,
        getCategory,
        createCategory,
        updateCategory,
        deleteCategory
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};