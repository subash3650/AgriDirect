const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const { generateToken } = require('../services/auth.service');
const { AppError, asyncHandler } = require('../middleware');

exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password, phno, role, state, city, pin, location } = req.body;

    let existingUser;
    if (role === 'farmer') {
        existingUser = await Farmer.findOne({ email });
    } else {
        existingUser = await Buyer.findOne({ email });
    }

    if (existingUser) return next(new AppError(`Email already registered as ${role}`, 400));

    const locationData = location || { coordinates: [], address: '' };
    let user;

    if (role === 'farmer') {
        user = await Farmer.create({ name, email, password, phno, state, city, pin, location: locationData });
    } else {
        user = await Buyer.create({ name, email, password, phno, state, city, pin, location: locationData });
    }

    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user: { id: user._id, name, email, role, phno, state, city, pin, location: locationData } });
});

exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) return next(new AppError('Provide email and password', 400));

    let user = await Farmer.findOne({ email }).select('+password');
    let role = 'farmer';
    
    if (!user) {
        user = await Buyer.findOne({ email }).select('+password');
        role = 'buyer';
    }

    
    if (!user || !user.password || !(await user.comparePassword(password))) {
        return next(new AppError('Invalid credentials', 401));
    }

    const token = generateToken(user._id);
    
    res.json({
        success: true,
        token,
        user: {
            id: user._id,
            profileId: user._id, 
            name: user.name,
            email: user.email,
            role: role,
            phno: user.phno,
            state: user.state,
            city: user.city,
            pin: user.pin
        }
    });
});

exports.getMe = asyncHandler(async (req, res) => {
    
    const user = req.user;

    res.json({
        success: true,
        user: {
            id: user._id,
            profileId: user._id,
            name: user.name,
            email: user.email,
            role: user.role, 
            phno: user.phno,
            state: user.state,
            city: user.city,
            pin: user.pin
        }
    });
});

exports.logout = asyncHandler(async (req, res) => res.json({ success: true, message: 'Logged out' }));
