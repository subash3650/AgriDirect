const User = require('../models/User');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const { generateToken } = require('../services/auth.service');
const { AppError, asyncHandler } = require('../middleware');

exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password, phno, role, state, city, pin } = req.body;

    if (await User.findOne({ email })) return next(new AppError('Email already exists', 400));

    const user = await User.create({ name, email, password, phno, role, state, city, pin });

    if (role === 'farmer') {
        await Farmer.create({ userId: user._id, name, email, phno, state, city, pin });
    } else {
        await Buyer.create({ userId: user._id, name, email, phno, state, city, pin });
    }

    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user: { id: user._id, name, email, role, phno, state, city, pin } });
});

exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) return next(new AppError('Provide email and password', 400));

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) return next(new AppError('Invalid credentials', 401));

    let profileId = null;
    if (user.role === 'farmer') profileId = (await Farmer.findOne({ userId: user._id }))?._id;
    else profileId = (await Buyer.findOne({ userId: user._id }))?._id;

    const token = generateToken(user._id);
    res.json({ success: true, token, user: { id: user._id, profileId, name: user.name, email: user.email, role: user.role, phno: user.phno, state: user.state, city: user.city, pin: user.pin } });
});

exports.getMe = asyncHandler(async (req, res) => {
    let profileId = null;
    if (req.user.role === 'farmer') profileId = (await Farmer.findOne({ userId: req.user._id }))?._id;
    else profileId = (await Buyer.findOne({ userId: req.user._id }))?._id;

    res.json({ success: true, user: { id: req.user._id, profileId, name: req.user.name, email: req.user.email, role: req.user.role, phno: req.user.phno, state: req.user.state, city: req.user.city, pin: req.user.pin } });
});

exports.logout = asyncHandler(async (req, res) => res.json({ success: true, message: 'Logged out' }));
