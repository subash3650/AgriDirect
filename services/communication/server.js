require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const conversationRoutes = require('./routes/conversation.routes');
const { errorHandler } = require('../shared/middleware/errorHandler');
const { setupSocketHandlers } = require('./services/socket.service');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5005;

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io available globally
global.io = io;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
}));

// Health check
app.get('/health', (req, res) => {
    res.json({
        service: 'communication-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connections: io.engine.clientsCount
    });
});

// Routes
app.use('/api/conversations', conversationRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Database connection and server start
const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/agridirect');
        console.log('✅ Communication Service: MongoDB connected');

        // Setup socket handlers
        setupSocketHandlers(io);

        server.listen(PORT, () => {
            console.log(`🚀 Communication Service running on port ${PORT}`);
            console.log(`📡 WebSocket server ready`);
        });
    } catch (error) {
        console.error('❌ Communication Service failed to start:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = { app, io };
