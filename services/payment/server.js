const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const paymentRoutes = require('./routes/payment.routes');
const { errorHandler } = require('../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.PAYMENT_SERVICE_PORT || 5007;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(compression());
app.use(morgan('dev'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Parse JSON (but preserve raw body for webhook signature verification)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
    // Store raw body as string for signature verification
    req.rawBody = req.body.toString('utf8');
    try {
        req.body = JSON.parse(req.rawBody);
    } catch (e) {
        req.body = {};
    }
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for payment creation endpoints only (not confirmation)
const paymentRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Allow more attempts for legitimate users
    message: { success: false, message: 'Too many payment attempts, please try again later' }
});

// Apply rate limiting selectively
app.use('/api/payments/create-order', paymentRateLimiter);
app.use('/api/payments/create-qr', paymentRateLimiter);
app.use('/api/payments/verify', paymentRateLimiter);

// Health check
app.get('/health', (req, res) => {
    res.json({
        service: 'payment-service',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/payments', paymentRoutes);

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
        console.log('✅ Payment Service: MongoDB connected');

        app.listen(PORT, () => {
            console.log(`🚀 Payment Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Payment Service failed to start:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;
