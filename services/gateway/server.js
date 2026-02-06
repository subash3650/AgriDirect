require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const proxy = require('express-http-proxy');
const rateLimit = require('express-rate-limit');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));  // Add request size limit

// Rate Limiting - General
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, message: 'Too many requests, please try again later.' }
});

// Rate Limiting - Stricter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,  // Stricter for auth
    message: { success: false, message: 'Too many authentication attempts.' }
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// Service URLs - Use 127.0.0.1 to avoid IPv4/IPv6 ambiguity
const AUTH_SERVICE = process.env.AUTH_SERVICE || 'http://127.0.0.1:5001';
const USER_SERVICE = process.env.USER_SERVICE || 'http://127.0.0.1:5002';
const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE || 'http://127.0.0.1:5003';
const ORDER_SERVICE = process.env.ORDER_SERVICE || 'http://127.0.0.1:5004';
const COMM_SERVICE = process.env.COMM_SERVICE || 'http://127.0.0.1:5005';
const FEEDBACK_SERVICE = process.env.FEEDBACK_SERVICE || 'http://127.0.0.1:5006';
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE || 'http://127.0.0.1:5007';

// Proxy configuration helper with TIMEOUTS
const proxyOptions = (servicePath) => ({
    proxyReqPathResolver: (req) => servicePath + req.url,
    timeout: 30000,  // 30 second timeout
    proxyErrorHandler: (err, res, next) => {
        console.error(`❌ Proxy error for ${servicePath}:`, err.code, err.message);
        if (!res.headersSent) {
            res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
        }
    }
});

// Proxy Routes
app.use('/api/auth', proxy(AUTH_SERVICE, proxyOptions('/api/auth')));
app.use('/api/farmers', proxy(USER_SERVICE, proxyOptions('/api/farmers')));
app.use('/api/buyers', proxy(USER_SERVICE, proxyOptions('/api/buyers')));
app.use('/api/products', proxy(PRODUCT_SERVICE, proxyOptions('/api/products')));
app.use('/api/orders', proxy(ORDER_SERVICE, proxyOptions('/api/orders')));
app.use('/api/optimize', proxy(ORDER_SERVICE, proxyOptions('/api/optimize')));
app.use('/api/conversations', proxy(COMM_SERVICE, proxyOptions('/api/conversations')));
app.use('/api/feedback', proxy(FEEDBACK_SERVICE, proxyOptions('/api/feedback')));
app.use('/api/payments', proxy(PAYMENT_SERVICE, proxyOptions('/api/payments')));

// Health Check - REAL (pings services)
const checkService = async (url) => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve('timeout'), 3000);
        const req = http.get(`${url}/health`, (res) => {
            clearTimeout(timeout);
            resolve(res.statusCode === 200 ? 'healthy' : 'unhealthy');
        });

        req.on('error', (err) => {
            clearTimeout(timeout);
            console.error(`⚠️ Health check failed for ${url}:`, err.message);
            resolve('down');
        });
    });
};

app.get('/health', async (req, res) => {
    const checks = await Promise.all([
        checkService(AUTH_SERVICE),
        checkService(USER_SERVICE),
        checkService(PRODUCT_SERVICE),
        checkService(ORDER_SERVICE),
        checkService(COMM_SERVICE),
        checkService(FEEDBACK_SERVICE),
        checkService(PAYMENT_SERVICE)
    ]);

    const services = {
        gateway: { status: 'healthy', port: PORT },
        auth: { url: AUTH_SERVICE, status: checks[0] },
        user: { url: USER_SERVICE, status: checks[1] },
        product: { url: PRODUCT_SERVICE, status: checks[2] },
        order: { url: ORDER_SERVICE, status: checks[3] },
        communication: { url: COMM_SERVICE, status: checks[4] },
        feedback: { url: FEEDBACK_SERVICE, status: checks[5] },
        payment: { url: PAYMENT_SERVICE, status: checks[6] }
    };

    const allHealthy = checks.every(s => s === 'healthy');
    res.status(allHealthy ? 200 : 207).json({
        service: 'api-gateway',
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Gateway Error:', err.message);
    res.status(500).json({ success: false, message: 'Internal gateway error' });
});

// Start Server with graceful shutdown
const server = app.listen(PORT, () => {
    console.log(`🚀 API Gateway running on port ${PORT}`);
    console.log('');
    console.log('Routing to services:');
    console.log(`  /api/auth         -> ${AUTH_SERVICE}`);
    console.log(`  /api/farmers      -> ${USER_SERVICE}`);
    console.log(`  /api/buyers       -> ${USER_SERVICE}`);
    console.log(`  /api/products     -> ${PRODUCT_SERVICE}`);
    console.log(`  /api/orders       -> ${ORDER_SERVICE}`);
    console.log(`  /api/optimize     -> ${ORDER_SERVICE}`);
    console.log(`  /api/conversations -> ${COMM_SERVICE}`);
    console.log(`  /api/feedback     -> ${FEEDBACK_SERVICE}`);
    console.log(`  /api/payments     -> ${PAYMENT_SERVICE}`);
});

// Graceful shutdown
const shutdown = () => {
    console.log('\n🛑 Shutting down gateway gracefully...');
    server.close(() => {
        console.log('Gateway closed.');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);  // Force exit after 10s
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;
