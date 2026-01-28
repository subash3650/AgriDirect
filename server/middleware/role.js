const { AppError } = require('./errorHandler');

const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return next(new AppError('Not authorized for this action', 403));
    }
    next();
};

module.exports = { authorize };
