const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();


app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));


app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));


app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/farmers', require('./routes/farmers'));
app.use('/api/buyers', require('./routes/buyers'));
app.use('/api/feedback', require('./routes/feedback'));


app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));


app.use(errorHandler);

module.exports = app;
