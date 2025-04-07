import React from 'react';
import { useParams } from 'react-router-dom';
import Dashboard from './Dashboard';

// For now, CategoryView will just render the Dashboard
const CategoryView = () => {
  const { categoryId } = useParams();
  return <Dashboard />;
};

export default CategoryView;