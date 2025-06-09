const mongoose = require('mongoose');

const CtfRunningChallengeSchema = new mongoose.Schema({
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: [true, 'Reference to base challenge is required']
  },
  flag: {
    type: String,
    required: [true, 'Challenge flag is required']
  },
  points: {
    type: Number,
    required: [true, 'Challenge points are required'],
    min: [0, 'Points must be a positive number']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deployed: {
    type: Boolean,
    default: false
  },
  deploymentURL: {
    type: String,
    default: ''
  },
  dockerImage: {
    type: String,
    default: ''
  },
  dockerContainer: {
    type: String,
    default: ''
  },
  dockerPort: {
    type: Number,
    default: null
  },
  databaseConfig: {
    connectionString: {
      type: String,
      default: ''
    },
    host: {
      type: String,
      default: ''
    },
    port: {
      type: Number,
      default: null
    },
    username: {
      type: String,
      default: ''
    },
    password: {
      type: String,
      default: ''
    },
    databaseName: {
      type: String,
      default: ''
    },
    accessLevel: {
      type: String,
      enum: ['readonly', 'readwrite', 'admin'],
      default: 'readwrite'
    }
  },
  hints: [{
    content: String,
    cost: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('CtfRunningChallenge', CtfRunningChallengeSchema);
