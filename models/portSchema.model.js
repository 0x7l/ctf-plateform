const mongoose = require('mongoose');

const portSchema = new mongoose.Schema({
    port: {
        type: String,
        required: true,
        unique: true,
    },
    allocatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Challenge',
        required: true
    },
    allocatedAt: {
        type: Date,
        default: Date.now
    },
    active: {
        type: Boolean,
        default: true
    },
});

module.exports =  mongoose.model('Port', portSchema);