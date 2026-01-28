const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        userId: { type: mongoose.Schema.Types.ObjectId, required: true },
        userType: { type: String, enum: ['farmer', 'buyer'], required: true },
        name: String,
        lastSeen: Date
    }],
    // Optional: Link to a specific product context
    productContext: {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: String
    },
    lastMessage: {
        text: String,
        senderId: mongoose.Schema.Types.ObjectId,
        timestamp: Date
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: {}
    }
}, { timestamps: true });

// Indexes for efficient querying
conversationSchema.index({ 'participants.userId': 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
