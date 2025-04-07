import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { FilterContext } from '../contexts/FilterContext';
import { CategoryContext } from '../contexts/CategoryContext';

const FilterManagement = () => {
  const { 
    filters, 
    loading: filtersLoading, 
    error: filtersError, 
    createFilter,
    updateFilter,
    deleteFilter,
    activateFilter,
    deactivateFilter
  } = useContext(FilterContext);
  
  const { categories, loading: categoriesLoading } = useContext(CategoryContext);
  
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    conditionsMatch: 'all',
    conditions: [{ field: 'subject', operator: 'contains', value: '', caseSensitive: false }],
    actions: [{ type: 'applyCategory', value: '' }]
  });
  
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Pre-fill form when editing a filter
  useEffect(() => {
    if (editingId) {
      const filter = filters.find(f => f._id === editingId);
      if (filter) {
        setFormData({
          name: filter.name,
          isActive: filter.isActive,
          conditionsMatch: filter.conditionsMatch,
          conditions: [...filter.conditions],
          actions: [...filter.actions]
        });
      }
    }
  }, [editingId, filters]);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleToggle = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.checked
    });
  };
  
  const handleConditionChange = (index, field, value) => {
    const updatedConditions = [...formData.conditions];
    updatedConditions[index] = {
      ...updatedConditions[index],
      [field]: value
    };
    
    setFormData({
      ...formData,
      conditions: updatedConditions
    });
  };
  
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
  
  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        { field: 'subject', operator: 'contains', value: '', caseSensitive: false }
      ]
    });
  };
  
  const removeCondition = (index) => {
    if (formData.conditions.length <= 1) {
      return; // Keep at least one condition
    }
    
    const updatedConditions = [...formData.conditions];
    updatedConditions.splice(index, 1);
    
    setFormData({
      ...formData,
      conditions: updatedConditions
    });
  };
  
  const addAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        { type: 'applyCategory', value: '' }
      ]
    });
  };
  
  const removeAction = (index) => {
    if (formData.actions.length <= 1) {
      return; // Keep at least one action
    }
    
    const updatedActions = [...formData.actions];
    updatedActions.splice(index, 1);
    
    setFormData({
      ...formData,
      actions: updatedActions
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    
    try {
      // Validate form
      const invalidConditions = formData.conditions.some(condition => !condition.value);
      const invalidCategoryActions = formData.actions.some(
        action => action.type === 'applyCategory' && !action.value
      );
      
      if (invalidConditions) {
        setMessage({ type: 'error', text: 'All conditions must have a value' });
        setSubmitting(false);
        return;
      }
      
      if (invalidCategoryActions) {
        setMessage({ type: 'error', text: 'Please select a category for all category actions' });
        setSubmitting(false);
        return;
      }
      
      let result;
      
      if (editingId) {
        // Update existing filter
        result = await updateFilter(editingId, formData);
        if (result.success) {
          setMessage({ type: 'success', text: 'Filter updated successfully' });
          setEditingId(null);
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to update filter' });
        }
      } else {
        // Create new filter
        result = await createFilter(formData);
        if (result.success) {
          setMessage({ type: 'success', text: 'Filter created successfully' });
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to create filter' });
        }
      }
      
      // Reset form on success
      if (result.success) {
        setFormData({
          name: '',
          isActive: true,
          conditionsMatch: 'all',
          conditions: [{ field: 'subject', operator: 'contains', value: '', caseSensitive: false }],
          actions: [{ type: 'applyCategory', value: '' }]
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred' });
      console.error(err);
    }
    
    setSubmitting(false);
  };
  
  const handleDelete = async (filterId) => {
    if (window.confirm('Are you sure you want to delete this filter?')) {
      try {
        const result = await deleteFilter(filterId);
        
        if (result.success) {
          setMessage({ type: 'success', text: 'Filter deleted successfully' });
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to delete filter' });
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'An error occurred' });
        console.error(err);
      }
    }
  };
  
  const handleToggleActive = async (filterId, currentState) => {
    try {
      let result;
      
      if (currentState) {
        result = await deactivateFilter(filterId);
      } else {
        result = await activateFilter(filterId);
      }
      
      if (!result.success) {
        setMessage({ 
          type: 'error', 
          text: result.error || `Failed to ${currentState ? 'deactivate' : 'activate'} filter` 
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred' });
      console.error(err);
    }
  };
  
  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '',
      isActive: true,
      conditionsMatch: 'all',
      conditions: [{ field: 'subject', operator: 'contains', value: '', caseSensitive: false }],
      actions: [{ type: 'applyCategory', value: '' }]
    });
  };
  
  const loading = filtersLoading || categoriesLoading;
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  // Display filter details in a readable format
  const getFilterDetails = (filter) => {
    const conditionsList = filter.conditions.map((condition, index) => {
      let field = '';
      switch (condition.field) {
        case 'subject':
          field = 'Subject';
          break;
        case 'from':
          field = 'From';
          break;
        case 'body':
          field = 'Body';
          break;
        default:
          field = condition.field;
      }
      
      let operator = '';
      switch (condition.operator) {
        case 'contains':
          operator = 'contains';
          break;
        case 'equals':
          operator = 'equals';
          break;
        case 'startsWith':
          operator = 'starts with';
          break;
        case 'endsWith':
          operator = 'ends with';
          break;
        default:
          operator = condition.operator;
      }
      
      return (
        <div key={index} className="filter-condition">
          {field} {operator} <span className="condition-value">"{condition.value}"</span>
          {condition.caseSensitive && <span className="case-sensitive">(case sensitive)</span>}
        </div>
      );
    });
    
    const actionsList = filter.actions.map((action, index) => {
      let actionText = '';
      switch (action.type) {
        case 'applyCategory':
          const category = categories.find(c => c._id === action.value);
          actionText = category 
            ? <span>Apply category <span className="category-badge" style={{ backgroundColor: category.color }}>{category.name}</span></span>
            : 'Apply category';
          break;
        case 'markAsRead':
          actionText = 'Mark as read';
          break;
        case 'star':
          actionText = 'Star email';
          break;
        case 'archive':
          actionText = 'Archive email';
          break;
        default:
          actionText = action.type;
      }
      
      return (
        <div key={index} className="filter-action">
          {actionText}
        </div>
      );
    });
    
    return (
      <div className="filter-details">
        <div className="filter-conditions">
          <h4>When {filter.conditionsMatch === 'all' ? 'ALL' : 'ANY'} of:</h4>
          {conditionsList}
        </div>
        <div className="filter-actions-list">
          <h4>Then:</h4>
          {actionsList}
        </div>
      </div>
    );
  };
  
  return (
    <div className="filter-management-page">
      <header className="page-header">
        <h1>Filter Management</h1>
        <Link to="/" className="back-link">Back to Dashboard</Link>
      </header>
      
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="page-content">
        <div className="filter-form-container">
          <h2>{editingId ? 'Edit Filter' : 'Create New Filter'}</h2>
          
          <form onSubmit={handleSubmit} className="filter-form">
            <div className="form-group">
              <label htmlFor="name">Filter Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleToggle}
              />
              <label htmlFor="isActive">Active</label>
            </div>
            
            <div className="form-section">
              <h3>Conditions</h3>
              
              <div className="form-group">
                <label htmlFor="conditionsMatch">Match</label>
                <select
                  id="conditionsMatch"
                  name="conditionsMatch"
                  value={formData.conditionsMatch}
                  onChange={handleChange}
                >
                  <option value="all">ALL of the following</option>
                  <option value="any">ANY of the following</option>
                </select>
              </div>
              
              {formData.conditions.map((condition, index) => (
                <div key={index} className="condition-item">
                  <div className="condition-header">
                    <span>Condition {index + 1}</span>
                    {formData.conditions.length > 1 && (
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeCondition(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="condition-fields">
                    <select
                      value={condition.field}
                      onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
                    >
                      <option value="subject">Subject</option>
                      <option value="from">From</option>
                      <option value="body">Body</option>
                    </select>
                    
                    <select
                      value={condition.operator}
                      onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                    >
                      <option value="contains">contains</option>
                      <option value="equals">equals</option>
                      <option value="startsWith">starts with</option>
                      <option value="endsWith">ends with</option>
                    </select>
                    
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                      placeholder="Value to match"
                      required
                    />
                  </div>
                  
                  <div className="condition-options">
                    <input
                      type="checkbox"
                      id={`caseSensitive-${index}`}
                      checked={condition.caseSensitive}
                      onChange={(e) => handleConditionChange(index, 'caseSensitive', e.target.checked)}
                    />
                    <label htmlFor={`caseSensitive-${index}`}>Case sensitive</label>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                className="add-btn"
                onClick={addCondition}
              >
                Add Condition
              </button>
            </div>
            
            <div className="form-section">
              <h3>Actions</h3>
              
              {formData.actions.map((action, index) => (
                <div key={index} className="action-item">
                  <div className="action-header">
                    <span>Action {index + 1}</span>
                    {formData.actions.length > 1 && (
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeAction(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="action-fields">
                    <select
                      value={action.type}
                      onChange={(e) => handleActionChange(index, 'type', e.target.value)}
                    >
                      <option value="applyCategory">Apply Category</option>
                      <option value="markAsRead">Mark as Read</option>
                      <option value="star">Star Email</option>
                      <option value="archive">Archive Email</option>
                    </select>
                    
                    {action.type === 'applyCategory' && (
                      <select
                        value={action.value}
                        onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                        required
                      >
                        <option value="">Select a category</option>
                        {categories.map(category => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                className="add-btn"
                onClick={addAction}
              >
                Add Action
              </button>
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
                {submitting ? 'Saving...' : editingId ? 'Update Filter' : 'Create Filter'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="filters-list">
          <h2>Your Filters</h2>
          
          {filtersError && <div className="error-message">{filtersError}</div>}
          
          {filters.length === 0 ? (
            <div className="no-filters">
              No filters yet. Create your first one!
            </div>
          ) : (
            <div className="filter-items">
              {filters.map(filter => (
                <div 
                  key={filter._id} 
                  className={`filter-item ${filter.isActive ? 'active' : 'inactive'}`}
                >
                  <div className="filter-header">
                    <div className="filter-name">
                      {filter.name}
                      <span className={`status-badge ${filter.isActive ? 'active' : 'inactive'}`}>
                        {filter.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="filter-toggle">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={filter.isActive}
                          onChange={() => handleToggleActive(filter._id, filter.isActive)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  </div>
                  
                  {getFilterDetails(filter)}
                  
                  <div className="filter-actions">
                    <button
                      className="edit-button"
                      onClick={() => setEditingId(filter._id)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(filter._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterManagement;