const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        userId: { type: mongoose.Schema.Types.ObjectId, required: true },
        userType: { type: String, enum: ['farmer', 'buyer'], required: true },
        name: { type: String, required: true },
        lastSeen: { type: Date }
    }],
    lastMessage: {
        text: { type: String },
        senderId: { type: mongoose.Schema.Types.ObjectId },
        timestamp: { type: Date }
    },
    unreadCount: { type: Map, of: Number, default: {} }
}, { timestamps: true });

// Index for finding conversations by participant
conversationSchema.index({ 'participants.userId': 1 });

// Compound index for lastMessage timestamp for sorting (common query)
conversationSchema.index({ 'participants.userId': 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
