const mongoose = require('mongoose');

const SolveSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CtfRunningChallenge',
    required: [true, 'Challenge ID is required']
  },
  solvedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Solve', SolveSchema);
