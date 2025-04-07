const mongoose = require('mongoose');

const filterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  conditions: [{
    field: {
      type: String,
      required: true
    },
    operator: {
      type: String,
      required: true,
      enum: ['contains', 'equals', 'startsWith', 'endsWith']
    },
    value: {
      type: String,
      required: true
    },
    caseSensitive: {
      type: Boolean,
      default: false
    }
  }],
  conditionsMatch: {
    type: String,
    enum: ['all', 'any'],
    default: 'all'
  },
  actions: [{
    type: {
      type: String,
      required: true,
      enum: ['applyCategory', 'markAsRead', 'star', 'archive']
    },
    value: {
      type: String,
      default: ''
    }
  }]
}, { timestamps: true });

// Method to check if email matches filter conditions
filterSchema.methods.matchesEmail = function(email) {
  const matchAll = this.conditionsMatch === 'all';
  
  return this.conditions.reduce((result, condition) => {
    const matches = matchCondition(email, condition);
    
    if (matchAll) {
      return result && matches;
    } else {
      return result || matches;
    }
  }, matchAll);
};

// Static method to apply all filters to an email
filterSchema.statics.applyFiltersToEmail = async function(userId, email) {
  const filters = await this.find({ userId, isActive: true });
  
  let actions = [];
  
  for (const filter of filters) {
    if (filter.matchesEmail(email)) {
      actions = [...actions, ...filter.actions];
    }
  }
  
  return actions;
};

function matchCondition(email, condition) {
  let fieldValue = '';
  
  // Check if email has all required fields
  if (!email) return false;
  
  switch (condition.field) {
    case 'subject':
      fieldValue = email.subject || '';
      break;
    case 'from':
      if (email.from) {
        const fromName = email.from.name || '';
        const fromEmail = email.from.email || '';
        fieldValue = `${fromName} ${fromEmail}`.trim();
      }
      break;
    case 'body':
      if (email.body) {
        fieldValue = email.body.text || '';
      }
      
      // Special handling for metadata-only emails
      if (email.metadata && email.metadata.isMetadataOnly && !fieldValue) {
        // For metadata-only emails with no body access,
        // don't try to match body conditions (would always fail)
        if (condition.operator === 'contains' || condition.operator === 'equals') {
          // Only return false for exact matches, return true for 'contains' with empty string
          return condition.value === '';
        }
        // For other operators, body conditions won't match
        return false;
      }
      break;
    default:
      return false;
  }
  
  // Safely convert to string
  fieldValue = String(fieldValue);
  
  const testValue = condition.caseSensitive ? fieldValue : fieldValue.toLowerCase();
  const compareValue = condition.caseSensitive ? condition.value : condition.value.toLowerCase();
  
  switch (condition.operator) {
    case 'contains':
      return testValue.includes(compareValue);
    case 'equals':
      return testValue === compareValue;
    case 'startsWith':
      return testValue.startsWith(compareValue);
    case 'endsWith':
      return testValue.endsWith(compareValue);
    default:
      return false;
  }
}

module.exports = mongoose.model('Filter', filterSchema);