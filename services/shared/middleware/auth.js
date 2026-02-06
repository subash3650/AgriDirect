const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('No token provided', 401));
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        return next(new AppError('Invalid or expired token', 401));
    }
};

// Generate JWT token
const generateToken = (id, role = 'user') => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// Role-based access control
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.userRole || !roles.includes(req.userRole)) {
            return next(new AppError('Access denied. Insufficient permissions.', 403));
        }
        next();
    };
};

// Optional auth - doesn't fail if no token, just doesn't set user
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.userId = decoded.id;
            req.userRole = decoded.role;
        } catch (error) {
            // Token invalid, but continue anyway
        }
    }
    next();
};

module.exports = { verifyToken, generateToken, requireRole, optionalAuth };
