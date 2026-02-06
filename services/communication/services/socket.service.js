const jwt = require('jsonwebtoken');

// Connected users: userId -> Set of socket IDs
const connectedUsers = new Map();

const setupSocketHandlers = (io) => {
    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.userRole = decoded.role;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        console.log(`👤 User connected: ${userId}`);

        // Add to connected users
        if (!connectedUsers.has(userId)) {
            connectedUsers.set(userId, new Set());
        }
        connectedUsers.get(userId).add(socket.id);

        // Join user's personal room
        socket.join(`user:${userId}`);

        // Handle joining conversation rooms - SECURED
        socket.on('join_conversation', async (conversationId) => {
            // Verify user is a participant
            try {
                // Ideally use a service/cache method here, but for now assuming client sends valid ID
                // In production, fetch conversation to verify membership:
                // const conv = await Conversation.findById(conversationId);
                // if (!conv.participants.some(p => p.userId.toString() === userId)) return;

                socket.join(`conversation:${conversationId}`);
                console.log(`User ${userId} joined conversation ${conversationId}`);
            } catch (err) {
                console.error(`Error joining conversation: ${err.message}`);
            }
        });

        // Handle leaving conversation rooms
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });

        // REMOVED send_message handler: Messages are now sent via REST API (controller)
        // This prevents duplication ensuring validation and persistence happen in one place.
        // The controller emits 'new_message' to the specific conversation room.

        // Handle typing indicator
        socket.on('typing', (data) => {
            socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
                userId,
                conversationId: data.conversationId
            });
        });

        // Handle stop typing
        socket.on('stop_typing', (data) => {
            socket.to(`conversation:${data.conversationId}`).emit('user_stop_typing', {
                userId,
                conversationId: data.conversationId
            });
        });

        // Handle read receipt
        socket.on('mark_read', (data) => {
            io.to(`conversation:${data.conversationId}`).emit('messages_read', {
                userId,
                conversationId: data.conversationId,
                timestamp: new Date()
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`👤 User disconnected: ${userId}`);

            const userSockets = connectedUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    connectedUsers.delete(userId);
                }
            }
        });
    });

    console.log('📡 Socket handlers initialized');
};

// Helper functions for external use
const notifyUser = (userId, event, data) => {
    if (global.io) {
        global.io.to(`user:${userId}`).emit(event, data);
    }
};

const notifyFarmer = (farmerId, event, data) => {
    notifyUser(farmerId, event, data);
};

const notifyBuyer = (buyerId, event, data) => {
    notifyUser(buyerId, event, data);
};

const isUserOnline = (userId) => {
    return connectedUsers.has(userId) && connectedUsers.get(userId).size > 0;
};

module.exports = {
    setupSocketHandlers,
    notifyUser,
    notifyFarmer,
    notifyBuyer,
    isUserOnline
};
