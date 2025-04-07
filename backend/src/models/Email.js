const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emailProviderId: {
    type: String,
    required: true
  },
  threadId: {
    type: String,
    required: true
  },
  from: {
    name: String,
    email: { type: String, required: true }
  },
  to: [{
    name: String,
    email: { type: String, required: false }
  }],
  subject: {
    type: String,
    default: ''
  },
  body: {
    text: String,
    html: String
  },
  attachments: [{
    filename: String,
    contentType: String,
    size: Number,
    url: String
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  metadata: {
    importance: String,
    hasAttachments: Boolean,
    isMetadataOnly: {
      type: Boolean,
      default: false
    }
  }
}, { timestamps: true });

// Add a compound unique index to prevent duplicate emails for the same user
emailSchema.index({ userId: 1, emailProviderId: 1 }, { unique: true });

module.exports = mongoose.model('Email', emailSchema);