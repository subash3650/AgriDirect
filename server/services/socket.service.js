const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const Conversation = require('../models/Conversation');

let io;

// Store online users
const onlineUsers = new Map();

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST']
        }
    });

    // Authentication middleware for socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                // Allow connection but mark as unauthenticated
                socket.user = null;
                return next();
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Try to find user in Farmer or Buyer collections
            let user = await Farmer.findById(decoded.id);
            let userType = 'farmer';

            if (!user) {
                user = await Buyer.findById(decoded.id);
                userType = 'buyer';
            }

            if (user) {
                socket.user = { ...user.toObject(), userType };
            }

            next();
        } catch (err) {
            next();
        }
    });

    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id);

        // If authenticated, set up user-specific rooms
        if (socket.user) {
            const userId = socket.user._id.toString();

            // Add to online users
            onlineUsers.set(userId, socket.id);

            // Join user's personal room
            socket.join(`user_${userId}`);

            // Join role-specific room
            if (socket.user.userType === 'farmer') {
                socket.join(`farmer_${userId}`);
            } else {
                socket.join(`buyer_${userId}`);
            }

            // Join all conversation rooms this user is part of
            joinConversationRooms(socket, userId);

            // Broadcast online status
            socket.broadcast.emit('user_online', { userId, online: true });
        }

        // Legacy room joins (for backward compatibility)
        socket.on('joinFarmerRoom', (farmerId) => socket.join(`farmer_${farmerId}`));
        socket.on('joinBuyerRoom', (buyerId) => socket.join(`buyer_${buyerId}`));

        // Join specific conversation room
        socket.on('join_conversation', (conversationId) => {
            const roomName = `conversation_${conversationId.toString()}`;
            socket.join(roomName);
            console.log(`[Socket] User ${socket.user?.name} joined ${roomName}`);
        });

        // Leave conversation room
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(`conversation_${conversationId}`);
        });

        // Handle typing indicators
        socket.on('typing', (data) => {
            const { conversationId, isTyping } = data;
            socket.to(`conversation_${conversationId}`).emit('user_typing', {
                conversationId,
                userId: socket.user?._id,
                userName: socket.user?.name,
                isTyping
            });
        });

        // Handle read receipts
        socket.on('message_read', async (data) => {
            const { conversationId, messageIds } = data;
            socket.to(`conversation_${conversationId}`).emit('messages_read', {
                conversationId,
                messageIds,
                readBy: socket.user?._id
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('Socket disconnected:', socket.id);
            if (socket.user) {
                const userId = socket.user._id.toString();
                onlineUsers.delete(userId);

                // Broadcast offline status
                socket.broadcast.emit('user_online', { userId, online: false });
            }
        });
    });

    return io;
};

// Helper to join all conversation rooms for a user
async function joinConversationRooms(socket, userId) {
    try {
        const conversations = await Conversation.find({
            'participants.userId': userId
        });

        conversations.forEach(conv => {
            const roomName = `conversation_${conv._id.toString()}`;
            socket.join(roomName);
        });
        console.log(`[Socket] User ${userId} joined ${conversations.length} conversation rooms`);
    } catch (err) {
        console.error('Error joining conversation rooms:', err);
    }
}

// Notify specific farmer
const notifyFarmer = (farmerId, event, data) => {
    if (io) io.to(`farmer_${farmerId}`).emit(event, data);
};

// Notify specific buyer
const notifyBuyer = (buyerId, event, data) => {
    if (io) io.to(`buyer_${buyerId}`).emit(event, data);
};

// Notify specific user (farmer or buyer)
const notifyUser = (userId, event, data) => {
    if (io) io.to(`user_${userId}`).emit(event, data);
};

// Notify all participants in a conversation
const notifyConversation = (conversationId, event, data) => {
    if (io) io.to(`conversation_${conversationId}`).emit(event, data);
};

// Check if user is online
const isUserOnline = (userId) => onlineUsers.has(userId);

// Get socket.io instance
const getIO = () => io;

module.exports = {
    initializeSocket,
    notifyFarmer,
    notifyBuyer,
    notifyUser,
    notifyConversation,
    isUserOnline,
    getIO
};
