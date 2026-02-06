require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const orderRoutes = require('./routes/order.routes');
const optimizationRoutes = require('./routes/optimization.routes');
const { errorHandler } = require('../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5004;

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
    max: 100
}));

// Health check
app.get('/health', (req, res) => {
    res.json({
        service: 'order-service',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/optimize', optimizationRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

const connectWithRetry = async () => {
    const MAX_RETRIES = 5;
    let count = 0;

    while (count < MAX_RETRIES) {
        try {
            await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/agridirect', {
                serverSelectionTimeoutMS: 5000 // Fail fast if no connection
            });
            console.log('✅ Order Service: MongoDB connected');
            return;
        } catch (error) {
            count++;
            console.log(`⚠️ MongoDB connection attempt ${count} failed. Retrying in 5s...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    throw new Error('Failed to connect to MongoDB after multiple attempts');
};

// Database connection and server start
const startServer = async () => {
    try {
        const { verifyEmailConfig } = require('./services/email.service');

        // Connect with retry
        await connectWithRetry();

        // Verify Email Service on Startup
        await verifyEmailConfig();

        const server = app.listen(PORT, () => {
            console.log(`🚀 Order Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Order Service failed to start:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;
