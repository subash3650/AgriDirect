const jwt = require('jsonwebtoken');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const { AppError } = require('../../shared/middleware/errorHandler');

// Protect routes - verify JWT and load full user object
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) return next(new AppError('Not authorized', 401));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Try to find user as farmer first
        let user = await Farmer.findById(decoded.id);
        let role = 'farmer';

        // If not found, try buyer
        if (!user) {
            user = await Buyer.findById(decoded.id);
            role = 'buyer';
        }

        if (!user) return next(new AppError('User not found', 401));

        // Attach user to request
        req.user = user;
        req.user.role = role;
        req.userId = user._id;
        req.userRole = role;
        next();
    } catch (error) {
        next(new AppError('Not authorized', 401));
    }
};

module.exports = { protect };
