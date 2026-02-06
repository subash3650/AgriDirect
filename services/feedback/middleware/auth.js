const jwt = require('jsonwebtoken');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const { AppError } = require('../../shared/middleware/errorHandler');

const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) return next(new AppError('Not authorized', 401));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        let user = await Farmer.findById(decoded.id);
        let role = 'farmer';
        if (!user) {
            user = await Buyer.findById(decoded.id);
            role = 'buyer';
        }
        if (!user) return next(new AppError('User not found', 401));

        req.user = user;
        req.user.role = role;
        next();
    } catch (error) {
        next(new AppError('Not authorized', 401));
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('Not authorized for this route', 403));
        }
        next();
    };
};

module.exports = { protect, authorize };
