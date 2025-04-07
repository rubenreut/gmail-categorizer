import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { CategoryContext } from '../contexts/CategoryContext';

const CategoryManagement = () => {
  const { categories, loading, error, createCategory, updateCategory, deleteCategory } = useContext(CategoryContext);
  
  const [formData, setFormData] = useState({
    name: '',
    color: '#4285f4',
    icon: 'label',
    keywords: ''
  });
  
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Pre-fill form when editing a category
  useEffect(() => {
    if (editingId) {
      const category = categories.find(c => c._id === editingId);
      if (category) {
        setFormData({
          name: category.name,
          color: category.color,
          icon: category.icon,
          keywords: category.keywords.join(', ')
        });
      }
    }
  }, [editingId, categories]);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    
    try {
      // Parse keywords string into array
      const keywordsArray = formData.keywords
        .split(',')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0);
      
      const categoryData = {
        name: formData.name,
        color: formData.color,
        icon: formData.icon,
        keywords: keywordsArray
      };
      
      let result;
      
      if (editingId) {
        // Update existing category
        result = await updateCategory(editingId, categoryData);
        if (result.success) {
          setMessage({ type: 'success', text: 'Category updated successfully' });
          setEditingId(null);
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to update category' });
        }
      } else {
        // Create new category
        result = await createCategory(categoryData);
        if (result.success) {
          setMessage({ type: 'success', text: 'Category created successfully' });
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to create category' });
        }
      }
      
      // Reset form on success
      if (result.success) {
        setFormData({
          name: '',
          color: '#4285f4',
          icon: 'label',
          keywords: ''
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred' });
      console.error(err);
    }
    
    setSubmitting(false);
  };
  
  const handleDelete = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const result = await deleteCategory(categoryId);
        
        if (result.success) {
          setMessage({ type: 'success', text: 'Category deleted successfully' });
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to delete category' });
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'An error occurred' });
        console.error(err);
      }
    }
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '',
      color: '#4285f4',
      icon: 'label',
      keywords: ''
    });
  };
  
  // Available icons
  const icons = ['label', 'inbox', 'people', 'local_offer', 'info', 'forum', 'work', 'flight'];
  
  if (loading) {
    return <div className="loading">Loading categories...</div>;
  }
  
  return (
    <div className="category-management-page">
      <header className="page-header">
        <h1>Category Management</h1>
        <Link to="/" className="back-link">Back to Dashboard</Link>
      </header>
      
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="page-content">
        <div className="category-form-container">
          <h2>{editingId ? 'Edit Category' : 'Create New Category'}</h2>
          
          <form onSubmit={handleSubmit} className="category-form">
            <div className="form-group">
              <label htmlFor="name">Category Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="color">Color</label>
              <div className="color-picker">
                <input
                  type="color"
                  id="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                />
                <span className="color-value">{formData.color}</span>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="icon">Icon</label>
              <select
                id="icon"
                name="icon"
                value={formData.icon}
                onChange={handleChange}
              >
                {icons.map(icon => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
              
              <div className="icon-preview" style={{ backgroundColor: formData.color }}>
                {formData.icon === 'inbox' && '📥'}
                {formData.icon === 'people' && '👥'}
                {formData.icon === 'local_offer' && '🏷️'}
                {formData.icon === 'info' && 'ℹ️'}
                {formData.icon === 'forum' && '💬'}
                {formData.icon === 'work' && '💼'}
                {formData.icon === 'flight' && '✈️'}
                {formData.icon === 'label' && '🏷️'}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="keywords">Keywords (comma separated)</label>
              <textarea
                id="keywords"
                name="keywords"
                value={formData.keywords}
                onChange={handleChange}
                placeholder="meeting, report, project"
                rows={3}
              />
              <small className="helper-text">
                These keywords will be used to automatically categorize emails.
              </small>
            </div>
            
            <div className="form-actions">
              {editingId && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="submit-button"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="categories-list">
          <h2>Your Categories</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          {categories.length === 0 ? (
            <div className="no-categories">
              No custom categories yet. Create your first one!
            </div>
          ) : (
            <div className="category-items">
              {categories.map(category => (
                <div 
                  key={category._id} 
                  className={`category-item ${category.isSystem ? 'system' : ''}`}
                >
                  <div className="category-header">
                    <div 
                      className="category-icon" 
                      style={{ backgroundColor: category.color }}
                    >
                      {category.icon === 'inbox' && '📥'}
                      {category.icon === 'people' && '👥'}
                      {category.icon === 'local_offer' && '🏷️'}
                      {category.icon === 'info' && 'ℹ️'}
                      {category.icon === 'forum' && '💬'}
                      {category.icon === 'work' && '💼'}
                      {category.icon === 'flight' && '✈️'}
                      {category.icon === 'label' && '🏷️'}
                    </div>
                    <div className="category-name">
                      {category.name}
                      {category.isSystem && <span className="system-badge">System</span>}
                    </div>
                  </div>
                  
                  <div className="category-keywords">
                    {category.keywords.map((keyword, idx) => (
                      <span key={idx} className="keyword">{keyword}</span>
                    ))}
                  </div>
                  
                  {!category.isSystem && (
                    <div className="category-actions">
                      <button
                        className="edit-button"
                        onClick={() => setEditingId(category._id)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(category._id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;