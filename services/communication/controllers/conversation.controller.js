const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const { asyncHandler, AppError } = require('../../shared/middleware/errorHandler');

// Get all conversations for current user
exports.getConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const conversations = await Conversation.find({
        'participants.userId': userId
    }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, conversations });
});

// Get specific conversation with messages
exports.getConversation = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;
    const conversation = await Conversation.findById(id).lean();
    if (!conversation) return next(new AppError('Conversation not found', 404));

    const isParticipant = conversation.participants.some(
        p => p.userId.toString() === userId.toString()
    );
    if (!isParticipant) return next(new AppError('Access denied', 403));

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const messages = await Message.find({ conversationId: id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    res.json({ success: true, conversation, messages: messages.reverse() });
});

const Joi = require('joi');

// Validation Schemas
const createConversationSchema = Joi.object({
    recipientId: Joi.string().required(),
    recipientType: Joi.string().valid('farmer', 'buyer').required(),
    initialMessage: Joi.string().allow('').optional()
});

const sendMessageSchema = Joi.object({
    text: Joi.string().required().min(1).max(5000), // Prevent huge messages
    metadata: Joi.object().optional()
});

// ... existing code ...

// Start new conversation
exports.createConversation = asyncHandler(async (req, res, next) => {
    const { error } = createConversationSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    const { recipientId, recipientType, initialMessage } = req.body;
    const sender = req.user;
    const senderType = sender.role || 'buyer';

    // Validate recipient existence first
    let recipient;
    if (recipientType === 'farmer') {
        recipient = await Farmer.findById(recipientId);
    } else {
        recipient = await Buyer.findById(recipientId);
    }
    if (!recipient) return next(new AppError('Recipient not found', 404));

    // Use findOne first to check existence (standard path)
    let conversation = await Conversation.findOne({
        $and: [
            { 'participants.userId': sender._id },
            { 'participants.userId': recipientId }
        ]
    });

    if (conversation) {
        return res.json({ success: true, conversation, existing: true });
    }

    try {
        // Atomic creation attempt
        // Ensure you have a compound unique index on participants in schema for this to be truly race-proof
        conversation = await Conversation.create({
            participants: [
                { userId: sender._id, userType: senderType, name: sender.name },
                { userId: recipientId, userType: recipientType, name: recipient.name }
            ],
            unreadCount: new Map([[recipientId.toString(), 0]])
        });
    } catch (err) {
        // Handle race condition where simultaneous create calls happen
        if (err.code === 11000) {
            conversation = await Conversation.findOne({
                $and: [
                    { 'participants.userId': sender._id },
                    { 'participants.userId': recipientId }
                ]
            });
            return res.json({ success: true, conversation, existing: true });
        }
        throw err;
    }

    if (initialMessage) {
        const message = await Message.create({
            conversationId: conversation._id,
            senderId: sender._id,
            senderType,
            text: initialMessage
        });
        conversation.lastMessage = { text: initialMessage, senderId: sender._id, timestamp: message.createdAt };
        conversation.unreadCount.set(recipientId.toString(), 1);
        await conversation.save();
    }

    res.status(201).json({ success: true, conversation });
});

// Send message in conversation
exports.sendMessage = asyncHandler(async (req, res, next) => {
    const { error } = sendMessageSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    const { id } = req.params;
    const { text, metadata } = req.body;
    const sender = req.user;
    const senderType = sender.role || 'buyer';

    const conversation = await Conversation.findById(id);
    if (!conversation) return next(new AppError('Conversation not found', 404));

    const isParticipant = conversation.participants.some(
        p => p.userId.toString() === sender._id.toString()
    );
    if (!isParticipant) return next(new AppError('Access denied', 403));

    const message = await Message.create({
        conversationId: id,
        senderId: sender._id,
        senderType,
        text,
        metadata: metadata || { type: 'text' },
        readBy: [sender._id]
    });

    conversation.lastMessage = { text, senderId: sender._id, timestamp: message.createdAt };
    conversation.participants.forEach(p => {
        if (p.userId.toString() !== sender._id.toString()) {
            const currentCount = conversation.unreadCount.get(p.userId.toString()) || 0;
            conversation.unreadCount.set(p.userId.toString(), currentCount + 1);
        }
    });
    await conversation.save();

    // Emit via Socket.io
    if (global.io) {
        global.io.to(`conversation:${conversation._id}`).emit('new_message', { message, conversation: { _id: conversation._id, lastMessage: conversation.lastMessage } });
    }

    res.status(201).json({ success: true, message });
});

// Mark conversation as read
exports.markAsRead = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;
    const conversation = await Conversation.findById(id);
    if (!conversation) return next(new AppError('Conversation not found', 404));

    conversation.unreadCount.set(userId.toString(), 0);
    const participantIndex = conversation.participants.findIndex(p => p.userId.toString() === userId.toString());
    if (participantIndex !== -1) conversation.participants[participantIndex].lastSeen = new Date();
    await conversation.save();

    await Message.updateMany(
        { conversationId: id, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
    );

    res.json({ success: true, message: 'Marked as read' });
});

// Get unread count
exports.getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const conversations = await Conversation.find({ 'participants.userId': userId });
    let totalUnread = 0;
    conversations.forEach(conv => { totalUnread += conv.unreadCount.get(userId.toString()) || 0; });
    res.json({ success: true, unreadCount: totalUnread });
});

// Delete conversation
exports.deleteConversation = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;
    const conversation = await Conversation.findById(id);
    if (!conversation) return next(new AppError('Conversation not found', 404));

    const isParticipant = conversation.participants.some(p => p.userId.toString() === userId.toString());
    if (!isParticipant) return next(new AppError('Access denied', 403));

    await Message.deleteMany({ conversationId: id });
    await Conversation.findByIdAndDelete(id);
    res.json({ success: true, message: 'Conversation deleted' });
});
