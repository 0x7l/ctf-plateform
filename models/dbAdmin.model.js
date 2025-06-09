const mongoose = require('mongoose');

const DbAdminSchema = new mongoose.Schema({
  databaseType: {
    type: String,
    enum: ['mongodb', 'mysql', 'postgresql', 'sqlite', 'redis'],
    required: [true, 'Database type is required']
  },
  instanceName: {
    type: String,
    required: [true, 'Instance name is required'],
    unique: true
  },
  connectionString: {
    type: String,
    required: [true, 'Connection string is required']
  },
  host: {
    type: String,
    required: [true, 'Host is required']
  },
  port: {
    type: Number,
    required: [true, 'Port is required']
  },
  adminUsername: {
    type: String,
    required: [true, 'Admin username is required']
  },
  adminPassword: {
    type: String,
    required: [true, 'Admin password is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxConnections: {
    type: Number,
    default: 100
  },
  currentConnections: {
    type: Number,
    default: 0
  },
  deployedChallenges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CtfRunningChallenge'
  }],
  users: [{
    username: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    databaseName: {
      type: String,
      required: true
    },
    accessLevel: {
      type: String,
      enum: ['readonly', 'readwrite', 'admin'],
      default: 'readwrite'
    },
    createdFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CtfRunningChallenge'
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('DbAdmin', DbAdminSchema);
