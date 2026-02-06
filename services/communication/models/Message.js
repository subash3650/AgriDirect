const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderType: { type: String, enum: ['farmer', 'buyer'], required: true },
    text: { type: String, required: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId }],
    metadata: {
        type: { type: String, default: 'text' }, // text, image, order, etc.
        orderId: { type: mongoose.Schema.Types.ObjectId },
        imageUrl: { type: String }
    }
}, { timestamps: true });

// Index for finding messages by conversation
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
