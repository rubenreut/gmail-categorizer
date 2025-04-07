import React, { useState } from 'react';
import './FilterEditorMockup.css';

const FilterEditorMockup = () => {
  // Mock categories data
  const categories = [
    { id: 'cat1', name: 'Primary', color: '#4285f4' },
    { id: 'cat2', name: 'Social', color: '#ea4335' },
    { id: 'cat3', name: 'Promotions', color: '#34a853' },
    { id: 'cat4', name: 'Updates', color: '#fbbc04' },
    { id: 'cat5', name: 'Forums', color: '#673ab7' },
    { id: 'cat6', name: 'Work', color: '#0097a7' },
    { id: 'cat7', name: 'Travel', color: '#f06292' },
  ];
  
  // Mock filters data
  const [filters, setFilters] = useState([
    {
      id: 'filter1',
      name: 'Work Emails',
      isActive: true,
      conditions: [
        { field: 'from', operator: 'contains', value: '@company.com', caseSensitive: false },
        { field: 'subject', operator: 'contains', value: 'project', caseSensitive: false }
      ],
      conditionsMatch: 'any',
      actions: [
        { type: 'applyCategory', value: 'cat6' },
        { type: 'markAsRead', value: '' }
      ],
      lastRun: '2023-06-15T10:30:00Z',
      matchCount: 127
    },
    {
      id: 'filter2',
      name: 'Travel Bookings',
      isActive: true,
      conditions: [
        { field: 'from', operator: 'contains', value: 'booking', caseSensitive: false },
        { field: 'subject', operator: 'contains', value: 'reservation', caseSensitive: false },
        { field: 'subject', operator: 'contains', value: 'flight', caseSensitive: false }
      ],
      conditionsMatch: 'any',
      actions: [
        { type: 'applyCategory', value: 'cat7' },
        { type: 'star', value: '' }
      ],
      lastRun: '2023-06-14T15:45:00Z',
      matchCount: 42
    },
    {
      id: 'filter3',
      name: 'Newsletter Filter',
      isActive: false,
      conditions: [
        { field: 'subject', operator: 'contains', value: 'newsletter', caseSensitive: false }
      ],
      conditionsMatch: 'all',
      actions: [
        { type: 'applyCategory', value: 'cat3' }
      ],
      lastRun: '2023-06-10T09:15:00Z',
      matchCount: 56
    }
  ]);
  
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // Available fields for conditions
  const fields = [
    { value: 'from', label: 'From' },
    { value: 'to', label: 'To' },
    { value: 'cc', label: 'CC' },
    { value: 'subject', label: 'Subject' },
    { value: 'body', label: 'Email Body' },
    { value: 'hasAttachment', label: 'Has Attachment' }
  ];
  
  // Available operators based on field
  const operators = {
    from: [
      { value: 'contains', label: 'Contains' },
      { value: 'equals', label: 'Equals' },
      { value: 'startsWith', label: 'Starts with' },
      { value: 'endsWith', label: 'Ends with' },
      { value: 'matchesRegex', label: 'Matches pattern' }
    ],
    to: [
      { value: 'contains', label: 'Contains' },
      { value: 'equals', label: 'Equals' },
      { value: 'startsWith', label: 'Starts with' },
      { value: 'endsWith', label: 'Ends with' },
      { value: 'matchesRegex', label: 'Matches pattern' }
    ],
    cc: [
      { value: 'contains', label: 'Contains' },
      { value: 'equals', label: 'Equals' },
      { value: 'startsWith', label: 'Starts with' },
      { value: 'endsWith', label: 'Ends with' },
      { value: 'matchesRegex', label: 'Matches pattern' }
    ],
    subject: [
      { value: 'contains', label: 'Contains' },
      { value: 'equals', label: 'Equals' },
      { value: 'startsWith', label: 'Starts with' },
      { value: 'endsWith', label: 'Ends with' },
      { value: 'matchesRegex', label: 'Matches pattern' }
    ],
    body: [
      { value: 'contains', label: 'Contains' },
      { value: 'matchesRegex', label: 'Matches pattern' }
    ],
    hasAttachment: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' }
    ]
  };
  
  // Available actions
  const actions = [
    { value: 'applyCategory', label: 'Apply Category' },
    { value: 'markAsRead', label: 'Mark as Read' },
    { value: 'star', label: 'Star Email' },
    { value: 'archive', label: 'Archive Email' }
  ];
  
  // Form state
  const emptyForm = {
    name: '',
    isActive: true,
    conditions: [
      { field: 'from', operator: 'contains', value: '', caseSensitive: false }
    ],
    conditionsMatch: 'all',
    actions: [
      { type: 'applyCategory', value: '' }
    ]
  };
  
  const [formData, setFormData] = useState(emptyForm);
  
  // Handle filter selection
  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    setFormData({
      name: filter.name,
      isActive: filter.isActive,
      conditions: [...filter.conditions],
      conditionsMatch: filter.conditionsMatch,
      actions: [...filter.actions]
    });
    setEditMode(false);
  };
  
  // Handle new filter
  const handleNewFilter = () => {
    setSelectedFilter(null);
    setFormData(emptyForm);
    setEditMode(true);
  };
  
  // Handle edit mode
  const handleEditClick = () => {
    setEditMode(true);
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  // Handle toggle changes
  const handleToggleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.checked
    });
  };
  
  // Handle radio changes
  const handleRadioChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle condition changes
  const handleConditionChange = (index, field, value) => {
    const updatedConditions = [...formData.conditions];
    updatedConditions[index] = {
      ...updatedConditions[index],
      [field]: value
    };
    
    // Reset operator if field changes
    if (field === 'field') {
      updatedConditions[index].operator = 
        value === 'hasAttachment' ? 'true' : 'contains';
      
      // Reset value for hasAttachment
      if (value === 'hasAttachment') {
        updatedConditions[index].value = '';
      }
    }
    
    setFormData({
      ...formData,
      conditions: updatedConditions
    });
  };
  
  // Add condition
  const handleAddCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        { field: 'from', operator: 'contains', value: '', caseSensitive: false }
      ]
    });
  };
  
  // Remove condition
  const handleRemoveCondition = (index) => {
    const updatedConditions = formData.conditions.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      conditions: updatedConditions
    });
  };
  
  // Handle action changes
  const handleActionChange = (index, field, value) => {
    const updatedActions = [...formData.actions];
    updatedActions[index] = {
      ...updatedActions[index],
      [field]: value
    };
    
    setFormData({
      ...formData,
      actions: updatedActions
    });
  };
  
  // Add action
  const handleAddAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        { type: 'applyCategory', value: '' }
      ]
    });
  };
  
  // Remove action
  const handleRemoveAction = (index) => {
    const updatedActions = formData.actions.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      actions: updatedActions
    });
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedFilter) {
      // Update existing filter
      setFilters(filters.map(filter => 
        filter.id === selectedFilter.id 
          ? { 
              ...filter, 
              ...formData,
              lastRun: selectedFilter.lastRun,
              matchCount: selectedFilter.matchCount
            }
          : filter
      ));
    } else {
      // Create new filter
      const newFilter = {
        id: `filter${filters.length + 1}`,
        ...formData,
        lastRun: new Date().toISOString(),
        matchCount: 0
      };
      setFilters([...filters, newFilter]);
    }
    
    setEditMode(false);
    setSelectedFilter(null);
  };
  
  // Handle filter deletion
  const handleDeleteFilter = () => {
    if (selectedFilter) {
      setFilters(filters.filter(filter => filter.id !== selectedFilter.id));
      setSelectedFilter(null);
      setEditMode(false);
    }
  };
  
  // Handle filter activation toggle
  const handleToggleActive = () => {
    if (selectedFilter) {
      const updatedFilters = filters.map(filter => 
        filter.id === selectedFilter.id 
          ? { ...filter, isActive: !filter.isActive }
          : filter
      );
      
      setFilters(updatedFilters);
      setSelectedFilter({
        ...selectedFilter,
        isActive: !selectedFilter.isActive
      });
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  return (
    <div className="filter-editor-mockup">
      <header className="editor-header">
        <div className="brand">
          <svg className="logo" width="24" height="24" viewBox="0 0 24 24">
            <path d="M20,4H4C2.9,4,2,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V6C22,4.9,21.1,4,20,4z M20,8l-8,5l-8-5V6l8,5l8-5V8z" fill="#4285f4"/>
          </svg>
          <h1>Filter Management</h1>
        </div>
        
        <div className="user-menu">
          <button className="back-btn">
            <i className="material-icons">arrow_back</i>
            <span>Back to Inbox</span>
          </button>
        </div>
      </header>
      
      <div className="editor-content">
        <aside className="filters-sidebar">
          <div className="sidebar-header">
            <h2>Your Filters</h2>
            <button className="new-filter-btn" onClick={handleNewFilter}>
              <i className="material-icons">add</i>
              <span>New Filter</span>
            </button>
          </div>
          
          <div className="filters-list">
            {filters.map(filter => (
              <div 
                key={filter.id} 
                className={`filter-item ${selectedFilter?.id === filter.id ? 'active' : ''} ${!filter.isActive ? 'inactive' : ''}`}
                onClick={() => handleFilterSelect(filter)}
              >
                <div className="filter-item-header">
                  <span className="filter-name">{filter.name}</span>
                  <span className={`status-indicator ${filter.isActive ? 'active' : 'inactive'}`}></span>
                </div>
                <div className="filter-item-meta">
                  <span>{filter.conditions.length} condition{filter.conditions.length !== 1 ? 's' : ''}</span>
                  <span>{filter.matchCount} match{filter.matchCount !== 1 ? 'es' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
        
        <main className="filter-details">
          {selectedFilter ? (
            <>
              <div className="filter-header">
                <div className="filter-info">
                  <h2>{selectedFilter.name}</h2>
                  <div className={`status-badge ${selectedFilter.isActive ? 'active' : 'inactive'}`}>
                    {selectedFilter.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                
                <div className="filter-actions">
                  <button 
                    className={`toggle-btn ${selectedFilter.isActive ? 'deactivate' : 'activate'}`}
                    onClick={handleToggleActive}
                  >
                    <i className="material-icons">{selectedFilter.isActive ? 'pause' : 'play_arrow'}</i>
                    <span>{selectedFilter.isActive ? 'Deactivate' : 'Activate'}</span>
                  </button>
                  <button className="edit-btn" onClick={handleEditClick}>
                    <i className="material-icons">edit</i>
                    <span>Edit</span>
                  </button>
                  <button className="delete-btn" onClick={handleDeleteFilter}>
                    <i className="material-icons">delete</i>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
              
              {editMode ? (
                <div className="filter-edit-form">
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label>Filter Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleToggleChange}
                        />
                        <span>Active### /frontend/src/components/mockups/FilterEditorMockup.jsx (continued)
