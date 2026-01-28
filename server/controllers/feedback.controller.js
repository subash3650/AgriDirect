const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const { AppError, asyncHandler } = require('../middleware');

exports.createFeedback = asyncHandler(async (req, res, next) => {
    const { orderId, productId, rating, review } = req.body;

    
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'delivered') return next(new AppError('Cannot review this order', 400));

    
    const buyer = req.user; 
    if (order.buyer.toString() !== buyer._id.toString()) return next(new AppError('Not authorized', 403));

    
    const itemIndex = order.items.findIndex(i => i.product.toString() === productId);
    if (itemIndex === -1) return next(new AppError('Product not found in this order', 404));

    const item = order.items[itemIndex];

    
    if (item.reviewed) return next(new AppError('Item already reviewed', 400));

    
    const feedback = await Feedback.create({
        buyer: buyer._id,
        farmer: order.farmer,
        product: productId,
        order: order._id,
        buyerName: buyer.name,
        productName: item.name,
        rating,
        review,
        price: item.price,
        quantity: item.quantity,
        image: item.image
    });

    
    order.items[itemIndex].reviewed = true;

    
    const allReviewed = order.items.every(i => i.reviewed);
    if (allReviewed) order.feedbackDone = true;

    await order.save();

    
    const farmer = await Farmer.findById(order.farmer);
    if (farmer) {
        farmer.feedback.push(feedback._id);
        const allFeedback = await Feedback.find({ farmer: farmer._id });
        farmer.rating = allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length;
        await farmer.save();
    }

    
    const product = await Product.findById(productId);
    if (product) {
        product.totalReviews += 1;
        const productFeedback = await Feedback.find({ product: productId });
        product.rating = productFeedback.reduce((sum, f) => sum + f.rating, 0) / productFeedback.length;
        await product.save();
    }

    
    buyer.reviews.push(feedback._id);
    await buyer.save();

    res.status(201).json({ success: true, feedback });
});

exports.getProductFeedback = asyncHandler(async (req, res) => {
    const feedback = await Feedback.find({ product: req.params.productId }).sort({ createdAt: -1 });
    res.json({ success: true, feedback });
});

exports.getFarmerFeedback = asyncHandler(async (req, res) => {
    const feedback = await Feedback.find({ farmer: req.params.farmerId }).sort({ createdAt: -1 });
    res.json({ success: true, feedback });
});
