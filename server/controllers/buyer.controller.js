const Buyer = require('../models/Buyer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { AppError, asyncHandler } = require('../middleware');

exports.getDashboard = asyncHandler(async (req, res, next) => {
    const buyer = await Buyer.findOne({ userId: req.user._id });
    if (!buyer) return next(new AppError('Buyer not found', 404));

    const [orders, products] = await Promise.all([
        Order.find({ buyer: buyer._id }).sort({ createdAt: -1 }).limit(5),
        Product.find({ isActive: true, currentQuantity: { $gt: 0 } }).sort({ rating: -1 }).limit(6)
    ]);

    const activeOrders = await Order.countDocuments({ buyer: buyer._id, status: { $in: ['pending', 'processing', 'shipped'] } });
    const completedOrders = await Order.countDocuments({ buyer: buyer._id, status: 'delivered' });
    const spent = await Order.aggregate([{ $match: { buyer: buyer._id, status: 'delivered' } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]);

    res.json({
        success: true,
        dashboard: {
            stats: { activeOrders, completedOrders, totalSpent: spent[0]?.total || 0, cartItems: buyer.cart?.length || 0 },
            recentOrders: orders,
            recommendedProducts: products
        }
    });
});

exports.getProfile = asyncHandler(async (req, res, next) => {
    const buyer = await Buyer.findOne({ userId: req.user._id });
    if (!buyer) return next(new AppError('Buyer not found', 404));
    res.json({ success: true, buyer });
});

exports.updateProfile = asyncHandler(async (req, res, next) => {
    const buyer = await Buyer.findOneAndUpdate({ userId: req.user._id }, req.body, { new: true, runValidators: true });
    if (!buyer) return next(new AppError('Buyer not found', 404));
    res.json({ success: true, buyer });
});

exports.getCart = asyncHandler(async (req, res) => {
    const buyer = await Buyer.findOne({ userId: req.user._id }).populate('cart.product');
    res.json({ success: true, cart: buyer?.cart || [] });
});

exports.addToCart = asyncHandler(async (req, res, next) => {
    const buyer = await Buyer.findOne({ userId: req.user._id });
    const product = await Product.findById(req.body.productId);
    if (!product) return next(new AppError('Product not found', 404));

    const existingItem = buyer.cart.find(item => item.product.toString() === req.body.productId);
    if (existingItem) existingItem.quantity += req.body.quantity || 1;
    else buyer.cart.push({ product: product._id, quantity: req.body.quantity || 1, price: product.price });

    await buyer.save();
    res.json({ success: true, cart: buyer.cart });
});

exports.updateCartItem = asyncHandler(async (req, res, next) => {
    const buyer = await Buyer.findOne({ userId: req.user._id });
    const item = buyer.cart.find(i => i.product.toString() === req.params.productId);
    if (!item) return next(new AppError('Item not in cart', 404));

    item.quantity = req.body.quantity;
    await buyer.save();
    res.json({ success: true, cart: buyer.cart });
});

exports.removeFromCart = asyncHandler(async (req, res) => {
    const buyer = await Buyer.findOne({ userId: req.user._id });
    buyer.cart = buyer.cart.filter(i => i.product.toString() !== req.params.productId);
    await buyer.save();
    res.json({ success: true, cart: buyer.cart });
});

exports.clearCart = asyncHandler(async (req, res) => {
    const buyer = await Buyer.findOne({ userId: req.user._id });
    buyer.cart = [];
    await buyer.save();
    res.json({ success: true, message: 'Cart cleared' });
});
