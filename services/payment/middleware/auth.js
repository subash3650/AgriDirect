const jwt = require('jsonwebtoken');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const { AppError } = require('../../shared/middleware/errorHandler');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new AppError('Not authorized, no token', 401));
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user based on role
        let user;
        if (decoded.role === 'farmer') {
            user = await Farmer.findById(decoded.id);
        } else if (decoded.role === 'buyer') {
            user = await Buyer.findById(decoded.id);
        }

        if (!user) {
            return next(new AppError('User not found', 404));
        }

        req.user = user;
        req.user.role = decoded.role;
        next();
    } catch (error) {
        console.error('[Payment Auth] Error:', error.name, error.message);

        // Check if it's a JWT-specific error
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid token', 401));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new AppError('Token expired', 401));
        }

        // For other errors (database connection, etc.), return 500 instead of 401
        // This prevents false authentication failures from internal service errors
        return next(new AppError('Authentication service error', 500));
    }
};

// Authorize specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError(`Role ${req.user.role} is not authorized`, 403));
        }
        next();
    };
};
