const Farmer = require('../models/Farmer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const Buyer = require('../models/Buyer');
const { AppError, asyncHandler } = require('../../shared/middleware/errorHandler');

exports.getDashboard = asyncHandler(async (req, res, next) => {
    const farmer = req.user;

    // Payment filter: only count orders that are either cash OR paid online
    const paymentFilter = {
        $or: [
            { paymentMethod: 'cash' },
            { paymentStatus: 'paid' }
        ]
    };

    const [products, orders, feedback] = await Promise.all([
        Product.find({ owner: farmer._id }),
        Order.find({ farmer: farmer._id, ...paymentFilter }).sort({ createdAt: -1 }).limit(5),
        Feedback.find({ farmer: farmer._id }).sort({ createdAt: -1 }).limit(5)
    ]);

    const completedOrders = await Order.countDocuments({ farmer: farmer._id, status: 'delivered', ...paymentFilter });
    // Pending orders: only 'pending' and 'processing' that are valid (cash or paid)
    const pendingOrders = await Order.countDocuments({ farmer: farmer._id, status: { $in: ['pending', 'processing'] }, ...paymentFilter });
    // Revenue: only from delivered AND valid orders
    const revenue = await Order.aggregate([
        { $match: { farmer: farmer._id, status: 'delivered', ...paymentFilter } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

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
    res.json({ success: true, farmer: req.user });
});

exports.updateProfile = asyncHandler(async (req, res, next) => {
    const farmer = await Farmer.findByIdAndUpdate(req.user._id, req.body, { new: true, runValidators: true });
    if (!farmer) return next(new AppError('Farmer not found', 404));
    res.json({ success: true, farmer });
});

exports.getFeedback = asyncHandler(async (req, res) => {
    const farmer = req.user;
    const feedback = await Feedback.find({ farmer: farmer._id }).sort({ createdAt: -1 });
    res.json({ success: true, feedback });
});

exports.deleteAccount = asyncHandler(async (req, res, next) => {
    const farmer = req.user;

    const products = await Product.find({ owner: farmer._id });
    const productIds = products.map(p => p._id);

    await Promise.all([
        Order.deleteMany({
            farmer: farmer._id,
            status: { $in: ['pending', 'processing'] }
        }),
        Order.updateMany(
            { farmer: farmer._id, status: { $in: ['shipped', 'delivered', 'cancelled'] } },
            { $set: { farmer: null, farmerDeleted: true, product: null, productDeleted: true } }
        ),
        Product.deleteMany({ owner: farmer._id }),
        Buyer.updateMany(
            { 'cart.product': { $in: productIds } },
            { $pull: { cart: { product: { $in: productIds } } } }
        ),
        Feedback.deleteMany({ farmer: farmer._id })
    ]);

    await Farmer.findByIdAndDelete(farmer._id);

    res.json({
        success: true,
        message: 'Account deleted. Pending orders cancelled, and products removed.'
    });
});

// PUBLIC: Get farmer profile (no auth required)
exports.getPublicProfile = asyncHandler(async (req, res, next) => {
    const { farmerId } = req.params;

    const farmer = await Farmer.findById(farmerId).select(
        'name city state rating totalOrders location createdAt'
    );

    if (!farmer) {
        return next(new AppError('Farmer not found', 404));
    }

    const products = await Product.find({ owner: farmerId })
        .select('productName price currentQuantity allocatedQuantity image category description')
        .limit(20);

    const reviews = await Feedback.find({ farmer: farmerId })
        .select('rating review buyerName createdAt')
        .sort({ createdAt: -1 })
        .limit(10);

    res.json({
        success: true,
        farmer: {
            ...farmer.toObject(),
            productsCount: products.length
        },
        products,
        reviews
    });
});

// PUBLIC: Get all products for a specific farmer
exports.getFarmerProducts = asyncHandler(async (req, res) => {
    const { farmerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    const products = await Product.find({ owner: farmerId })
        .select('productName price quantity image category description ownerName')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });

    const total = await Product.countDocuments({ owner: farmerId });

    res.json({
        success: true,
        products,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});
