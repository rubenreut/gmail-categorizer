import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryContext } from '../../contexts/CategoryContext';
import CategoryList from '../../components/category/CategoryList';

// Mock data
const mockCategories = [
  {
    _id: 'cat1',
    name: 'Primary',
    color: '#4285f4',
    icon: 'inbox',
    isSystem: true,
    unreadCount: 5
  },
  {
    _id: 'cat2',
    name: 'Work',
    color: '#0f9d58',
    icon: 'work',
    isSystem: false,
    unreadCount: 3
  },
  {
    _id: 'cat3',
    name: 'Finance',
    color: '#db4437',
    icon: 'account_balance',
    isSystem: false,
    unreadCount: 0
  }
];

// Mock context value
const mockContextValue = {
  categories: mockCategories,
  selectedCategory: null,
  setSelectedCategory: jest.fn(),
  loading: false,
  error: null
};

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('CategoryList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders category list correctly', () => {
    render(
      <CategoryContext.Provider value={mockContextValue}>
        <CategoryList />
      </CategoryContext.Provider>
    );
    
    // Check if all categories are rendered
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    
    // Check if unread counts are displayed
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
  
  test('selects a category when clicked', () => {
    render(
      <CategoryContext.Provider value={mockContextValue}>
        <CategoryList />
      </CategoryContext.Provider>
    );
    
    // Click on a category
    fireEvent.click(screen.getByText('Work'));
    
    // Check if setSelectedCategory was called with the correct category
    expect(mockContextValue.setSelectedCategory).toHaveBeenCalledWith('cat2');
    
    // Check if navigate was called correctly
    expect(mockNavigate).toHaveBeenCalledWith('/category/cat2');
  });
  
  test('renders loading state', () => {
    render(
      <CategoryContext.Provider value={{ ...mockContextValue, loading: true }}>
        <CategoryList />
      </CategoryContext.Provider>
    );
    
    // Check if loading indicator is shown
    expect(screen.getByTestId('category-loading')).toBeInTheDocument();
  });
  
  test('renders error state', () => {
    render(
      <CategoryContext.Provider value={{ 
        ...mockContextValue, 
        error: 'Failed to load categories' 
      }}>
        <CategoryList />
      </CategoryContext.Provider>
    );
    
    // Check if error message is shown
    expect(screen.getByText('Failed to load categories')).toBeInTheDocument();
  });
});
