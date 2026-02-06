// OTP Generator
const generateOTP = (length = 4) => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
};

// Response formatter
const formatResponse = (success, data = null, message = null) => {
    const response = { success };
    if (message) response.message = message;
    if (data) response.data = data;
    return response;
};

// Pagination helper
const paginate = (page = 1, limit = 10) => {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    return { skip, limit: parseInt(limit) };
};

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
    const mongoose = require('mongoose');
    return mongoose.Types.ObjectId.isValid(id);
};

// Sanitize user object (remove sensitive fields)
const sanitizeUser = (user) => {
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;
    delete userObj.__v;
    return userObj;
};

module.exports = {
    generateOTP,
    formatResponse,
    paginate,
    isValidObjectId,
    sanitizeUser
};
