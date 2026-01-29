const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const { asyncHandler, AppError } = require('../middleware');

// Get all conversations for current user
exports.getConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const conversations = await Conversation.find({
        'participants.userId': userId
    })
        .sort({ updatedAt: -1 })
        .lean();

    res.json({ success: true, conversations });
});

// Get specific conversation with messages
exports.getConversation = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(id).lean();

    if (!conversation) {
        return next(new AppError('Conversation not found', 404));
    }

    // Verify user is a participant
    const isParticipant = conversation.participants.some(
        p => p.userId.toString() === userId.toString()
    );

    if (!isParticipant) {
        return next(new AppError('Access denied', 403));
    }

    // Get messages with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await Message.find({ conversationId: id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    res.json({
        success: true,
        conversation,
        messages: messages.reverse() // Return in chronological order
    });
});

// Start new conversation
exports.createConversation = asyncHandler(async (req, res, next) => {
    const { recipientId, recipientType, productId, initialMessage } = req.body;
    const sender = req.user;
    const senderType = sender.role || (sender.products ? 'farmer' : 'buyer');

    // Check if conversation already exists between these users
    const existingConversation = await Conversation.findOne({
        $and: [
            { 'participants.userId': sender._id },
            { 'participants.userId': recipientId }
        ]
    });

    if (existingConversation) {
        // Return existing conversation
        return res.json({
            success: true,
            conversation: existingConversation,
            existing: true
        });
    }

    // Get recipient details
    let recipient;
    if (recipientType === 'farmer') {
        recipient = await Farmer.findById(recipientId);
    } else {
        recipient = await Buyer.findById(recipientId);
    }

    if (!recipient) {
        return next(new AppError('Recipient not found', 404));
    }

    // Create conversation
    const conversationData = {
        participants: [
            {
                userId: sender._id,
                userType: senderType,
                name: sender.name
            },
            {
                userId: recipientId,
                userType: recipientType,
                name: recipient.name
            }
        ],
        unreadCount: new Map([[recipientId.toString(), 0]])
    };

    // Add product context if provided
    if (productId) {
        const Product = require('../models/Product');
        const product = await Product.findById(productId);
        if (product) {
            conversationData.productContext = {
                productId: product._id,
                productName: product.productName
            };
        }
    }

    const conversation = await Conversation.create(conversationData);

    // If initial message provided, send it
    if (initialMessage) {
        const message = await Message.create({
            conversationId: conversation._id,
            senderId: sender._id,
            senderType,
            text: initialMessage
        });

        // Update lastMessage
        conversation.lastMessage = {
            text: initialMessage,
            senderId: sender._id,
            timestamp: message.createdAt
        };
        conversation.unreadCount.set(recipientId.toString(), 1);
        await conversation.save();
    }

    res.status(201).json({ success: true, conversation });
});

// Send message in conversation
exports.sendMessage = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { text, metadata } = req.body;
    const sender = req.user;
    const senderType = sender.role || (sender.products ? 'farmer' : 'buyer');

    // Verify conversation exists and user is participant
    const conversation = await Conversation.findById(id);

    if (!conversation) {
        return next(new AppError('Conversation not found', 404));
    }

    const isParticipant = conversation.participants.some(
        p => p.userId.toString() === sender._id.toString()
    );

    if (!isParticipant) {
        return next(new AppError('Access denied', 403));
    }

    // Create message
    const message = await Message.create({
        conversationId: id,
        senderId: sender._id,
        senderType,
        text,
        metadata: metadata || { type: 'text' },
        readBy: [sender._id]
    });

    // Update conversation
    conversation.lastMessage = {
        text,
        senderId: sender._id,
        timestamp: message.createdAt
    };

    // Increment unread count for other participants
    conversation.participants.forEach(p => {
        if (p.userId.toString() !== sender._id.toString()) {
            const currentCount = conversation.unreadCount.get(p.userId.toString()) || 0;
            conversation.unreadCount.set(p.userId.toString(), currentCount + 1);
        }
    });

    await conversation.save();

    await conversation.save();

    // Emit via Socket.io (if available)
    // Emit via Socket.io
    const { getIO } = require('../services/socket.service');
    const io = getIO();
    if (io) {
        const roomName = `conversation_${conversation._id.toString()}`;
        console.log(`[Socket] Emitting new_message to room: ${roomName}`);
        io.to(roomName).emit('new_message', {
            message,
            conversation: {
                _id: conversation._id,
                lastMessage: conversation.lastMessage
            }
        });
    }

    res.status(201).json({ success: true, message });
});

// Mark conversation as read
exports.markAsRead = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
        return next(new AppError('Conversation not found', 404));
    }

    // Reset unread count for this user
    conversation.unreadCount.set(userId.toString(), 0);

    // Update participant's lastSeen
    const participantIndex = conversation.participants.findIndex(
        p => p.userId.toString() === userId.toString()
    );
    if (participantIndex !== -1) {
        conversation.participants[participantIndex].lastSeen = new Date();
    }

    await conversation.save();

    // Mark all messages as read by this user
    await Message.updateMany(
        { conversationId: id, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
    );

    res.json({ success: true, message: 'Marked as read' });
});

// Get unread count across all conversations
exports.getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const conversations = await Conversation.find({
        'participants.userId': userId
    });

    let totalUnread = 0;
    conversations.forEach(conv => {
        totalUnread += conv.unreadCount.get(userId.toString()) || 0;
    });

    res.json({ success: true, unreadCount: totalUnread });
});

// Delete conversation
exports.deleteConversation = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
        return next(new AppError('Conversation not found', 404));
    }

    // Verify user is a participant
    const isParticipant = conversation.participants.some(
        p => p.userId.toString() === userId.toString()
    );

    if (!isParticipant) {
        return next(new AppError('Access denied', 403));
    }

    // Delete all messages in this conversation
    await Message.deleteMany({ conversationId: id });

    // Delete the conversation
    await Conversation.findByIdAndDelete(id);

    res.json({ success: true, message: 'Conversation deleted' });
});
