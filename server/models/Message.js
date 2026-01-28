const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    senderType: {
        type: String,
        enum: ['farmer', 'buyer'],
        required: true
    },
    text: {
        type: String,
        required: true,
        maxlength: 2000
    },
    // For negotiation features
    metadata: {
        type: {
            type: String,
            enum: ['text', 'price_offer', 'quantity_inquiry', 'quality_question'],
            default: 'text'
        },
        originalPrice: Number,
        offeredPrice: Number,
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
    },
    readBy: [{ type: mongoose.Schema.Types.ObjectId }]
}, { timestamps: true });

// Indexes for efficient querying
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
