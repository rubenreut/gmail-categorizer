const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  preferences: {
    theme: {
      type: String,
      default: 'light'
    },
    emailsPerPage: {
      type: Number,
      default: 50
    },
    categorization: {
      applyAutomatically: {
        type: Boolean,
        default: true
      },
      mlSuggestions: {
        type: Boolean,
        default: true
      }
    },
    notifications: {
      enabled: {
        type: Boolean,
        default: true
      },
      emailDigest: {
        type: Boolean,
        default: false
      }
    }
  },
  // Gmail integration fields
  googleTokens: {
    access_token: String,
    refresh_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number
  },
  googleAuthState: String, // Temporary state for OAuth flow
  lastEmailSync: Date,
  syncInterval: {
    type: Number,
    default: 15  // Default sync interval in minutes
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);