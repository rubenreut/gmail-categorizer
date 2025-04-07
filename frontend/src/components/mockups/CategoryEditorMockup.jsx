import React, { useState } from 'react';
import './CategoryEditorMockup.css';

const CategoryEditorMockup = () => {
  // Mockup data
  const [categories, setCategories] = useState([
    { id: 'cat1', name: 'Primary', color: '#4285f4', icon: 'inbox', isSystem: true, keywords: ['important'] },
    { id: 'cat2', name: 'Social', color: '#ea4335', icon: 'people', isSystem: true, keywords: ['facebook', 'twitter', 'instagram', 'linkedin', 'social'] },
    { id: 'cat3', name: 'Promotions', color: '#34a853', icon: 'local_offer', isSystem: true, keywords: ['offer', 'discount', 'sale', 'promotion'] },
    { id: 'cat4', name: 'Updates', color: '#fbbc04', icon: 'info', isSystem: true, keywords: ['update', 'notification', 'alert'] },
    { id: 'cat5', name: 'Forums', color: '#673ab7', icon: 'forum', isSystem: true, keywords: ['forum', 'discussion', 'group'] },
    { id: 'cat6', name: 'Work', color: '#0097a7', icon: 'work', isSystem: false, keywords: ['project', 'meeting', 'deadline', 'task', 'report'] },
    { id: 'cat7', name: 'Travel', color: '#f06292', icon: 'flight', isSystem: false, keywords: ['flight', 'hotel', 'booking', 'reservation', 'itinerary'] },
  ]);
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // Icons for selection
  const availableIcons = [
    'inbox', 'people', 'local_offer', 'info', 'forum', 'work', 'flight',
    'receipt', 'account_balance', 'shopping_cart', 'school', 'favorite',
    'event', 'book', 'home', 'directions_car', 'fitness_center', 'restaurant'
  ];
  
  // Colors for selection
  const availableColors = [
    '#4285f4', '#ea4335', '#34a853', '#fbbc04', '#673ab7', 
    '#0097a7', '#f06292', '#ff5722', '#607d8b', '#795548',
    '#3f51b5', '#009688', '#e91e63', '#9c27b0', '#2196f3'
  ];
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    color: '#4285f4',
    icon: 'inbox',
    keywords: []
  });
  
  // Handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      color: category.color,
      icon: category.icon,
      keywords: category.keywords
    });
    setEditMode(false);
  };
  
  // Handle edit mode toggle
  const handleEditClick = () => {
    setEditMode(true);
  };
  
  // Handle form changes
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  // Handle color selection
  const handleColorSelect = (color) => {
    setFormData({
      ...formData,
      color
    });
  };
  
  // Handle icon selection
  const handleIconSelect = (icon) => {
    setFormData({
      ...formData,
      icon
    });
  };
  
  // Handle keyword addition
  const [newKeyword, setNewKeyword] = useState('');
  
  const handleAddKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, newKeyword.trim()]
      });
      setNewKeyword('');
    }
  };
  
  // Handle keyword removal
  const handleRemoveKeyword = (keyword) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter(k => k !== keyword)
    });
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedCategory) {
      // Update existing category
      setCategories(categories.map(cat => 
        cat.id === selectedCategory.id 
          ? { ...cat, ...formData }
          : cat
      ));
    } else {
      // Create new category
      const newCategory = {
        id: `cat${categories.length + 1}`,
        ...formData,
        isSystem: false
      };
      setCategories([...categories, newCategory]);
    }
    
    setEditMode(false);
    setSelectedCategory(null);
    setFormData({
      name: '',
      color: '#4285f4',
      icon: 'inbox',
      keywords: []
    });
  };
  
  // Handle "New Category" button
  const handleNewCategory = () => {
    setSelectedCategory(null);
    setFormData({
      name: '',
      color: '#4285f4',
      icon: 'inbox',
      keywords: []
    });
    setEditMode(true);
  };
  
  // Handle delete category
  const handleDeleteCategory = () => {
    if (selectedCategory && !selectedCategory.isSystem) {
      setCategories(categories.filter(cat => cat.id !== selectedCategory.id));
      setSelectedCategory(null);
      setEditMode(false);
    }
  };
  
  return (
    <div className="category-editor-mockup">
      <header className="editor-header">
        <div className="brand">
          <svg className="logo" width="24" height="24" viewBox="0 0 24 24">
            <path d="M20,4H4C2.9,4,2,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V6C22,4.9,21.1,4,20,4z M20,8l-8,5l-8-5V6l8,5l8-5V8z" fill="#4285f4"/>
          </svg>
          <h1>Category Management</h1>
        </div>
        
        <div className="user-menu">
          <button className="back-btn">
            <i className="material-icons">arrow_back</i>
            <span>Back to Inbox</span>
          </button>
        </div>
      </header>
      
      <div className="editor-content">
        <aside className="categories-sidebar">
          <div className="sidebar-header">
            <h2>Your Categories</h2>
            <button className="new-category-btn" onClick={handleNewCategory}>
              <i className="material-icons">add</i>
              <span>New Category</span>
            </button>
          </div>
          
          <div className="categories-list">
            {categories.map(category => (
              <div 
                key={category.id} 
                className={`category-item ${selectedCategory?.id === category.id ? 'active' : ''}`}
                onClick={() => handleCategorySelect(category)}
              >
                <i className="material-icons" style={{ color: category.color }}>{category.icon}</i>
                <span>{category.name}</span>
                {category.isSystem && <span className="system-badge">System</span>}
              </div>
            ))}
          </div>
        </aside>
        
        <main className="category-details">
          {selectedCategory ? (
            <>
              <div className="category-header">
                <div className="category-info">
                  <i className="material-icons" style={{ color: selectedCategory.color, fontSize: '36px' }}>
                    {selectedCategory.icon}
                  </i>
                  <h2>{selectedCategory.name}</h2>
                  {selectedCategory.isSystem && <span className="system-badge">System</span>}
                </div>
                
                <div className="category-actions">
                  {!selectedCategory.isSystem && (
                    <>
                      <button className="edit-btn" onClick={handleEditClick}>
                        <i className="material-icons">edit</i>
                        <span>Edit</span>
                      </button>
                      <button className="delete-btn" onClick={handleDeleteCategory}>
                        <i className="material-icons">delete</i>
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {editMode ? (
                <div className="category-edit-form">
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label>Category Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Category Color</label>
                      <div className="color-options">
                        {availableColors.map(color => (
                          <div 
                            key={color} 
                            className={`color-option ${formData.color === color ? 'active' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleColorSelect(color)}
                          ></div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Category Icon</label>
                      <div className="icon-options">
                        {availableIcons.map(icon => (
                          <div 
                            key={icon} 
                            className={`icon-option ${formData.icon === icon ? 'active' : ''}`}
                            onClick={() => handleIconSelect(icon)}
                          >
                            <i className="material-icons">{icon}</i>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Keywords for Automatic Categorization</label>
                      <div className="keyword-input">
                        <input
                          type="text"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          placeholder="Add a keyword"
                        />
                        <button type="button" onClick={handleAddKeyword}>Add</button>
                      </div>
                      <div className="keywords-list">
                        {formData.keywords.map(keyword => (
                          <div key={keyword} className="keyword-tag">
                            <span>{keyword}</span>
                            <i className="material-icons" onClick={() => handleRemoveKeyword(keyword)}>close</i>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="form-actions">
                      <button type="button" className="cancel-btn" onClick={() => setEditMode(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="save-btn">
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="category-details-view">
                  <div className="detail-section">
                    <h3>Category Details</h3>
                    <div className="detail-item">
                      <span className="detail-label">Color:</span>
                      <div className="color-preview" style={{ backgroundColor: selectedCategory.color }}></div>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Icon:</span>
                      <i className="material-icons">{selectedCategory.icon}</i>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Type:</span>
                      <span>{selectedCategory.isSystem ? 'System (Cannot be deleted)' : 'Custom'}</span>
                    </div>
                  </div>
                  
                  <div className="detail-section">
                    <h3>Keywords for Automatic Categorization</h3>
                    <div className="keywords-display">
                      {selectedCategory.keywords.length > 0 ? (
                        selectedCategory.keywords.map(keyword => (
                          <div key={keyword} className="keyword-tag">
                            <span>{keyword}</span>
                          </div>
                        ))
                      ) : (
                        <p className="no-keywords">No keywords defined. Emails won't be automatically categorized.</p>
                      )}
                    </div>
                    <p className="keywords-info">
                      Emails containing these keywords in the subject or body will be automatically assigned to this category.
                    </p>
                  </div>
                  
                  <div className="detail-section">
                    <h3>Statistics</h3>
                    <div className="stat-item">
                      <span className="stat-label">Total Emails:</span>
                      <span className="stat-value">143</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Unread Emails:</span>
                      <span className="stat-value">5</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Auto-Categorized:</span>
                      <span className="stat-value">89</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Manually Added:</span>
                      <span className="stat-value">54</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : editMode ? (
            <div className="category-edit-form new-category">
              <h2>Create New Category</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Category Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter category name"
                  />
                </div>
                
                <div className="form-group">
                  <label>Category Color</label>
                  <div className="color-options">
                    {availableColors.map(color => (
                      <div 
                        key={color} 
                        className={`color-option ${formData.color === color ? 'active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorSelect(color)}
                      ></div>
                    ))}
                  </div>### /frontend/src/components/mockups/CategoryEditorMockup.jsx (continued)
