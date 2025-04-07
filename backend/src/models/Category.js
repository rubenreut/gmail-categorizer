const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#4285f4'
  },
  icon: {
    type: String,
    default: 'label'
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  keywords: {
    type: [String],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);