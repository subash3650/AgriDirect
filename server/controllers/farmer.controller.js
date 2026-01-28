const Farmer = require('../models/Farmer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const { AppError, asyncHandler } = require('../middleware');

exports.getDashboard = asyncHandler(async (req, res, next) => {
    const farmer = await Farmer.findOne({ userId: req.user._id });
    if (!farmer) return next(new AppError('Farmer not found', 404));

    const [products, orders, feedback] = await Promise.all([
        Product.find({ owner: farmer._id }),
        Order.find({ farmer: farmer._id }).sort({ createdAt: -1 }).limit(5),
        Feedback.find({ farmer: farmer._id }).sort({ createdAt: -1 }).limit(5)
    ]);

    const completedOrders = await Order.countDocuments({ farmer: farmer._id, status: 'delivered' });
    const pendingOrders = await Order.countDocuments({ farmer: farmer._id, status: { $in: ['pending', 'processing', 'shipped'] } });
    const revenue = await Order.aggregate([{ $match: { farmer: farmer._id, status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]);

    res.json({
        success: true,
        dashboard: {
            stats: { totalProducts: products.length, pendingOrders, completedOrders, totalRevenue: revenue[0]?.total || 0 },
            recentOrders: orders,
            recentFeedback: feedback,
            rating: farmer.rating
        }
    });
});

exports.getProfile = asyncHandler(async (req, res, next) => {
    const farmer = await Farmer.findOne({ userId: req.user._id });
    if (!farmer) return next(new AppError('Farmer not found', 404));
    res.json({ success: true, farmer });
});

exports.updateProfile = asyncHandler(async (req, res, next) => {
    const farmer = await Farmer.findOneAndUpdate({ userId: req.user._id }, req.body, { new: true, runValidators: true });
    if (!farmer) return next(new AppError('Farmer not found', 404));
    res.json({ success: true, farmer });
});

exports.getFeedback = asyncHandler(async (req, res) => {
    const farmer = await Farmer.findOne({ userId: req.user._id });
    const feedback = await Feedback.find({ farmer: farmer._id }).sort({ createdAt: -1 });
    res.json({ success: true, feedback });
});
