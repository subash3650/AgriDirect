require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(helmet());
app.use(morgan('dev'));

// Health Check
app.get('/health', (req, res) => res.json({ status: 'OK', service: 'API Gateway' }));

// Auth Service -> 5001
app.use(createProxyMiddleware({
    target: 'http://localhost:5001',
    changeOrigin: true,
    pathFilter: '/api/auth', // v3 syntax: Match this path
    onError: (err, req, res) => {
        console.error('Auth Service Proxy Error:', err);
        res.status(503).json({ success: false, message: 'Auth Service Unavailable' });
    }
}));

app.use(createProxyMiddleware({
    target: 'http://localhost:5005',
    changeOrigin: true,
    pathFilter: (path) => path.startsWith('/api') && !path.startsWith('/api/auth'),
    onError: (err, req, res) => {
        console.error('Monolith Proxy Error:', err);
        res.status(503).json({ success: false, message: 'Backend Service Unavailable' });
    }
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Gateway running on port ${PORT}`));
