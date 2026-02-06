const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderType: { type: String, enum: ['farmer', 'buyer'], required: true },
    text: { type: String, required: true },
    metadata: { type: Object, default: {} },
    readBy: [{ type: mongoose.Schema.Types.ObjectId }]
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
