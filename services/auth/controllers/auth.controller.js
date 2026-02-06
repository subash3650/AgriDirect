const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const { generateToken } = require('../../shared/middleware/auth');
const { AppError, asyncHandler } = require('../../shared/middleware/errorHandler');
const Joi = require('joi');

// Validation Schemas
const registerSchema = Joi.object({
    name: Joi.string().required().min(2).max(50),
    email: Joi.string().email().required().lowercase(),
    password: Joi.string().required().min(8), // Enforce deeper complexity if needed
    phno: Joi.string().required().pattern(/^[0-9]{10}$/), // Expecting 10 digit number
    role: Joi.string().valid('farmer', 'buyer').required(),
    state: Joi.string().required(),
    city: Joi.string().required(),
    pin: Joi.number().required(),
    location: Joi.object({
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2).default([0, 0]),
        address: Joi.string().allow('').default('')
    }).optional()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// Register new user
exports.register = asyncHandler(async (req, res, next) => {
    // 1. Validate Input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
        return next(new AppError(error.details[0].message, 400));
    }

    const { name, email, password, phno, role, state, city, pin, location } = value;

    const locationData = location || { type: 'Point', coordinates: [0, 0], address: '' };

    let user;
    try {
        if (role === 'farmer') {
            const existingFarmer = await Farmer.findOne({ email });
            const existingBuyer = await Buyer.findOne({ email });
            if (existingFarmer || existingBuyer) {
                return next(new AppError('Email already registered', 400));
            }

            user = await Farmer.create({ name, email, password, phno, state, city, pin, location: locationData });
        } else {
            const existingFarmer = await Farmer.findOne({ email });
            const existingBuyer = await Buyer.findOne({ email });
            if (existingFarmer || existingBuyer) {
                return next(new AppError('Email already registered', 400));
            }

            user = await Buyer.create({ name, email, password, phno, state, city, pin, location: locationData });
        }
    } catch (err) {
        if (err.code === 11000) {
            return next(new AppError('Email already registered', 400));
        }
        throw err;
    }

    const token = generateToken(user._id, role);

    res.status(201).json({
        success: true,
        token,
        user: {
            id: user._id,
            name,
            email,
            role,
            phno,
            state,
            city,
            pin,
            location: locationData
        }
    });
});

// Login user
exports.login = asyncHandler(async (req, res, next) => {
    // 1. Validate Input
    const { error } = loginSchema.validate(req.body);
    if (error) {
        return next(new AppError(error.details[0].message, 400));
    }

    const { email, password } = req.body;

    // Try farmer first
    let user = await Farmer.findOne({ email }).select('+password');
    let role = 'farmer';

    // If not farmer, try buyer
    if (!user) {
        user = await Buyer.findOne({ email }).select('+password');
        role = 'buyer';
    }

    if (!user || !user.password || !(await user.comparePassword(password))) {
        return next(new AppError('Invalid credentials', 401));
    }

    const token = generateToken(user._id, role);

    res.json({
        success: true,
        token,
        user: {
            id: user._id,
            profileId: user._id,
            name: user.name,
            email: user.email,
            role,
            phno: user.phno,
            state: user.state,
            city: user.city,
            pin: user.pin,
            // Added location to match register response
            location: user.location
        }
    });
});

// Get current user
exports.getMe = asyncHandler(async (req, res, next) => {
    const userId = req.userId;
    const role = req.userRole;

    let user;
    if (role === 'farmer') {
        user = await Farmer.findById(userId);
    } else {
        user = await Buyer.findById(userId);
    }

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.json({
        success: true,
        user: {
            id: user._id,
            profileId: user._id,
            name: user.name,
            email: user.email,
            role,
            phno: user.phno,
            state: user.state,
            city: user.city,
            pin: user.pin,
            location: user.location
        }
    });
});

// Logout
exports.logout = asyncHandler(async (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// Verify token (for other services)
exports.verifyToken = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        userId: req.userId,
        role: req.userRole
    });
});
