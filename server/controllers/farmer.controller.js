const Farmer = require('../models/Farmer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const Buyer = require('../models/Buyer');
const { AppError, asyncHandler } = require('../middleware');

exports.getDashboard = asyncHandler(async (req, res, next) => {
    const farmer = req.user;

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

    // Get all product IDs owned by this farmer
    const products = await Product.find({ owner: farmer._id });
    const productIds = products.map(p => p._id);

    await Promise.all([
        // 1. Delete all Pending/Processing orders (User requested these be removed/cancelled)
        // This ensures unverified orders don't get stuck.
        Order.deleteMany({
            farmer: farmer._id,
            status: { $in: ['pending', 'processing'] }
        }),

        // 2. For Shipped/Delivered orders, keep them but mark farmer as deleted
        // This preserves history for the buyer.
        Order.updateMany(
            { farmer: farmer._id, status: { $in: ['shipped', 'delivered', 'cancelled'] } },
            { $set: { farmer: null, farmerDeleted: true, product: null, productDeleted: true } }
        ),

        // 3. Delete all products owned by the farmer
        Product.deleteMany({ owner: farmer._id }),

        // 4. Remove these products from any Buyer's cart
        // This ensures the product is marked "deleted" or removed from the cart.
        Buyer.updateMany(
            { 'cart.product': { $in: productIds } },
            { $pull: { cart: { product: { $in: productIds } } } }
        ),

        // 5. Delete all Feedback given TO this farmer
        Feedback.deleteMany({ farmer: farmer._id })
    ]);

    // 6. Delete the Farmer account
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

    // Get farmer's products (show all, not just in-stock)
    const products = await Product.find({ owner: farmerId })
        .select('productName price currentQuantity allocatedQuantity image category description')
        .limit(20);

    // Get farmer's reviews (select 'review' not 'comment' - that's the field name in Feedback model)
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
