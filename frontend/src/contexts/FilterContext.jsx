import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    if (currentUser) {
      fetchFilters();
    }
  }, [currentUser]);

  const fetchFilters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('http://localhost:5000/api/filters');
      setFilters(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching filters:', error);
      setError('Failed to load filters');
      setLoading(false);
      
      // For demo, set mock filters if the API fails
      setFilters([
        {
          _id: 'filter1',
          name: 'Work Emails',
          isActive: true,
          conditions: [
            {
              field: 'from',
              operator: 'contains',
              value: 'company.com',
              caseSensitive: false
            }
          ],
          conditionsMatch: 'all',
          actions: [
            {
              type: 'applyCategory',
              value: 'cat5' // Work category
            }
          ]
        },
        {
          _id: 'filter2',
          name: 'Social Media',
          isActive: true,
          conditions: [
            {
              field: 'from',
              operator: 'contains',
              value: 'linkedin.com',
              caseSensitive: false
            },
            {
              field: 'from',
              operator: 'contains',
              value: 'twitter.com',
              caseSensitive: false
            },
            {
              field: 'from',
              operator: 'contains',
              value: 'facebook.com',
              caseSensitive: false
            }
          ],
          conditionsMatch: 'any',
          actions: [
            {
              type: 'applyCategory',
              value: 'cat2' // Social category
            }
          ]
        }
      ]);
    }
  };

  const getFilter = (filterId) => {
    return filters.find(filter => filter._id === filterId);
  };

  const createFilter = async (filterData) => {
    try {
      setError(null);
      const response = await axios.post('http://localhost:5000/api/filters', filterData);
      
      setFilters([...filters, response.data.data]);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error creating filter:', error);
      setError(error.response?.data?.error || 'Failed to create filter');
      return { success: false, error: error.response?.data?.error || 'Failed to create filter' };
    }
  };

  const updateFilter = async (filterId, filterData) => {
    try {
      setError(null);
      const response = await axios.put(`http://localhost:5000/api/filters/${filterId}`, filterData);
      
      setFilters(filters.map(filter => 
        filter._id === filterId ? response.data.data : filter
      ));
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error updating filter:', error);
      setError(error.response?.data?.error || 'Failed to update filter');
      return { success: false, error: error.response?.data?.error || 'Failed to update filter' };
    }
  };

  const deleteFilter = async (filterId) => {
    try {
      setError(null);
      await axios.delete(`http://localhost:5000/api/filters/${filterId}`);
      
      setFilters(filters.filter(filter => filter._id !== filterId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting filter:', error);
      setError(error.response?.data?.error || 'Failed to delete filter');
      return { success: false, error: error.response?.data?.error || 'Failed to delete filter' };
    }
  };

  const activateFilter = async (filterId) => {
    try {
      setError(null);
      const response = await axios.patch(`http://localhost:5000/api/filters/${filterId}/activate`);
      
      setFilters(filters.map(filter => 
        filter._id === filterId ? { ...filter, isActive: true } : filter
      ));
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error activating filter:', error);
      setError(error.response?.data?.error || 'Failed to activate filter');
      return { success: false, error: error.response?.data?.error || 'Failed to activate filter' };
    }
  };

  const deactivateFilter = async (filterId) => {
    try {
      setError(null);
      const response = await axios.patch(`http://localhost:5000/api/filters/${filterId}/deactivate`);
      
      setFilters(filters.map(filter => 
        filter._id === filterId ? { ...filter, isActive: false } : filter
      ));
      
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error deactivating filter:', error);
      setError(error.response?.data?.error || 'Failed to deactivate filter');
      return { success: false, error: error.response?.data?.error || 'Failed to deactivate filter' };
    }
  };

  return (
    <FilterContext.Provider
      value={{
        filters,
        loading,
        error,
        fetchFilters,
        getFilter,
        createFilter,
        updateFilter,
        deleteFilter,
        activateFilter,
        deactivateFilter
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};