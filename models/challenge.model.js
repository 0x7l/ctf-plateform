const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Challenge title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Challenge description is required']
  },
  tags: {
    type: [String],
    default: []
  },
  hints: {
    type: [String],
    default: []
  },
  category: {
    type: String,
    required: [true, 'Challenge category is required']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    required: [true, 'Challenge difficulty is required']
  },
  github_url: {
    type: String,
    default: ''
  },
  deployable: {
    type: Boolean,
    default: false
  },
  databaseRequired: {
    type: Boolean,
    default: false
  },
  databaseType: {
    type: String,
    enum: ['mongodb', 'mysql', 'postgresql', 'sqlite', 'redis', 'none'],
    default: 'none'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Challenge', ChallengeSchema);
