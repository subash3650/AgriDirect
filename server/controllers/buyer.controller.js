const Buyer = require('../models/Buyer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const { AppError, asyncHandler } = require('../middleware');

exports.getDashboard = asyncHandler(async (req, res, next) => {
    const buyer = req.user; 

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
    res.json({ success: true, buyer: req.user });
});

exports.updateProfile = asyncHandler(async (req, res, next) => {
    const buyer = await Buyer.findByIdAndUpdate(req.user._id, req.body, { new: true, runValidators: true });
    if (!buyer) return next(new AppError('Buyer not found', 404));
    res.json({ success: true, buyer });
});

exports.getCart = asyncHandler(async (req, res) => {
    
    
    
    const buyer = await Buyer.findById(req.user._id).populate('cart.product');
    res.json({ success: true, cart: buyer?.cart || [] });
});

exports.addToCart = asyncHandler(async (req, res, next) => {
    const buyer = await Buyer.findById(req.user._id); 
    const product = await Product.findById(req.body.productId);
    if (!product) return next(new AppError('Product not found', 404));

    const quantityToAdd = Number(req.body.quantity) || 1;
    const existingItem = buyer.cart.find(item => item.product.toString() === req.body.productId);
    const newTotalQuantity = (existingItem ? existingItem.quantity : 0) + quantityToAdd;

    
    if (newTotalQuantity > product.currentQuantity) {
        return next(new AppError(`Cannot add ${quantityToAdd} items. Only ${product.currentQuantity - (existingItem ? existingItem.quantity : 0)} more available.`, 400));
    }

    if (existingItem) existingItem.quantity = newTotalQuantity;
    else buyer.cart.push({ product: product._id, quantity: quantityToAdd, price: product.price });

    await buyer.save();
    await buyer.populate('cart.product'); 
    res.json({ success: true, cart: buyer.cart });
});

exports.updateCartItem = asyncHandler(async (req, res, next) => {
    const buyer = await Buyer.findById(req.user._id);
    const item = buyer.cart.find(i => i.product.toString() === req.params.productId);
    if (!item) return next(new AppError('Item not in cart', 404));

    const product = await Product.findById(req.params.productId);
    if (!product) return next(new AppError('Product not found', 404));

    const newQuantity = Number(req.body.quantity);

    
    if (newQuantity > product.currentQuantity) {
        return next(new AppError(`Requested quantity (${newQuantity}) exceeds available stock (${product.currentQuantity})`, 400));
    }

    item.quantity = newQuantity;
    await buyer.save();
    await buyer.populate('cart.product');
    res.json({ success: true, cart: buyer.cart });
});

exports.removeFromCart = asyncHandler(async (req, res) => {
    const buyer = await Buyer.findById(req.user._id);
    buyer.cart = buyer.cart.filter(i => i.product.toString() !== req.params.productId);
    await buyer.save();
    await buyer.populate('cart.product');
    res.json({ success: true, cart: buyer.cart });
});

exports.clearCart = asyncHandler(async (req, res) => {
    const buyer = await Buyer.findById(req.user._id);
    buyer.cart = [];
    await buyer.save();
    res.json({ success: true, message: 'Cart cleared' });
});


exports.deleteAccount = asyncHandler(async (req, res, next) => {
    const buyer = req.user;

    
    await Promise.all([
        
        
        Order.updateMany(
            { buyer: buyer._id },
            { $set: { buyer: null, buyerDeleted: true } }
        ),
        
        Feedback.deleteMany({ buyer: buyer._id })
    ]);

    
    await Buyer.findByIdAndDelete(buyer._id);

    

    res.json({
        success: true,
        message: 'Account and all associated data deleted successfully'
    });
});
