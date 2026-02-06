require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth.routes');
const { errorHandler } = require('../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5001;

// Validate Environment Variables
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    process.exit(1);
}

if (!process.env.MONGO_URI) {
    console.warn('WARNING: MONGO_URI is not defined, using local fallback.');
}

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
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 auth requests per windowMs
    message: { success: false, message: 'Too many login flow attempts, please try again later.' }
});

app.use('/api/auth', authLimiter);
app.use('/api', globalLimiter);

// Health check
app.get('/health', (req, res) => {
    res.json({
        service: 'auth-service',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/auth', authRoutes);

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
        console.log('✅ Auth Service: MongoDB connected');

        app.listen(PORT, () => {
            console.log(`🚀 Auth Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Auth Service failed to start:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;
