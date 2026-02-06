// Shared library exports for AgriDirect microservices
const { AppError, asyncHandler, errorHandler } = require('./middleware/errorHandler');
const { verifyToken, generateToken, requireRole, optionalAuth } = require('./middleware/auth');
const { connectDB, disconnectDB } = require('./config/db');
const { generateOTP, formatResponse, paginate, isValidObjectId, sanitizeUser } = require('./utils');

module.exports = {
    // Middleware
    AppError,
    asyncHandler,
    errorHandler,
    verifyToken,
    generateToken,
    requireRole,
    optionalAuth,

    // Database
    connectDB,
    disconnectDB,

    // Utilities
    generateOTP,
    formatResponse,
    paginate,
    isValidObjectId,
    sanitizeUser
};
