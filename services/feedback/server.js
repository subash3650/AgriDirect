require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const feedbackRoutes = require('./routes/feedback.routes');
const { errorHandler } = require('../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5006;

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
        service: 'feedback-service',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/feedback', feedbackRoutes);

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
        console.log('✅ Feedback Service: MongoDB connected');

        app.listen(PORT, () => {
            console.log(`🚀 Feedback Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Feedback Service failed to start:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;
