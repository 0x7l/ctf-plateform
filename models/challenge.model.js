const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: [true, 'Difficulty is required'],
    },
    points: {
      type: Number,
      required: [true, 'Points are required'],
    },
    deployable: {
      type: Boolean,
      default: false,
    },
    github_url: {
      type: String,
      validate: {
        validator: function (url) {
          return /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(\.git)?$/.test(url);
        },
        message: 'Invalid GitHub URL format',
      },
    },
    port: {
      type: Number,
      default: 4445, // Default port if not provided
      validate: {
        validator: function (port) {
          return port >= 1 && port <= 65535;
        },
        message: 'Port must be a valid number between 1 and 65535',
      },
    },
    internalPort: {
      type: Number,
      default: 8080, // Default internal port if not provided
      validate: {
        validator: function (port) {
          return port >= 1 && port <= 65535;
        },
        message: 'Internal port must be a valid number between 1 and 65535',
      },
    },
    deploymentStatus: {
      type: String,
      enum: ['not_deployed', 'building', 'active', 'failed'],
      default: 'not_deployed',
    },
    containerId: {
      type: String,
      default: null,
    },
    deployedAt: {
      type: Date,
      default: null,
    },
    storagePath: {
      type: String,
      default: null,
    },
    logs: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

module.exports = mongoose.model('Challenge', ChallengeSchema);
