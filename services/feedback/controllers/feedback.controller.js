const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const { AppError, asyncHandler } = require('../../shared/middleware/errorHandler');
const Joi = require('joi');

// --- VALIDATION SCHEMAS ---
const createFeedbackSchema = Joi.object({
    orderId: Joi.string().required(),
    productId: Joi.string().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    review: Joi.string().min(10).max(1000).required()
});

// Helper: Sanitize review (strip HTML tags)
const sanitizeHTML = (str) => str.replace(/<[^>]*>/g, '').trim();

// Helper: Calculate average rating using aggregation (atomic, efficient)
const calculateAvgRating = async (Model, field, id) => {
    const result = await Feedback.aggregate([
        { $match: { [field]: id } },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    return result[0] || { avgRating: 0, count: 0 };
};

exports.createFeedback = asyncHandler(async (req, res, next) => {
    // PHASE 1: Validate input
    const { error, value } = createFeedbackSchema.validate(req.body);
    if (error) return next(new AppError(error.details[0].message, 400));

    const { orderId, productId, rating, review } = value;
    const sanitizedReview = sanitizeHTML(review);

    // Get order and validate ownership
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'delivered') {
        return next(new AppError('Cannot review this order', 400));
    }

    const buyer = req.user;
    if (order.buyer.toString() !== buyer._id.toString()) {
        return next(new AppError('Not authorized', 403));
    }

    // Find product in order items
    const itemIndex = order.items.findIndex(i => i.product.toString() === productId);
    if (itemIndex === -1) return next(new AppError('Product not found in this order', 404));

    const item = order.items[itemIndex];
    if (item.reviewed) return next(new AppError('Item already reviewed', 400));

    // Create feedback
    const feedback = await Feedback.create({
        buyer: buyer._id,
        farmer: order.farmer,
        product: productId,
        order: order._id,
        buyerName: buyer.name,
        productName: item.name,
        rating,
        review: sanitizedReview,
        price: item.price,
        quantity: item.quantity,
        image: item.image
    });

    // Update order item as reviewed (atomic)
    order.items[itemIndex].reviewed = true;
    order.feedbackDone = order.items.every(i => i.reviewed);
    await order.save();

    // PHASE 1 FIX: Atomic rating updates using aggregation (no race conditions)
    // Update farmer rating
    const farmerStats = await calculateAvgRating(Feedback, 'farmer', order.farmer);
    await Farmer.findByIdAndUpdate(order.farmer, {
        rating: Math.round(farmerStats.avgRating * 10) / 10  // Round to 1 decimal
    });

    // Update product rating
    const productStats = await calculateAvgRating(Feedback, 'product', productId);
    await Product.findByIdAndUpdate(productId, {
        rating: Math.round(productStats.avgRating * 10) / 10,
        totalReviews: productStats.count
    });

    res.status(201).json({ success: true, feedback });
});

exports.getProductFeedback = asyncHandler(async (req, res) => {
    // PHASE 2: Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [feedback, total] = await Promise.all([
        Feedback.find({ product: req.params.productId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Feedback.countDocuments({ product: req.params.productId })
    ]);

    res.json({
        success: true,
        feedback,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
});

exports.getFarmerFeedback = asyncHandler(async (req, res) => {
    // PHASE 2: Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [feedback, total] = await Promise.all([
        Feedback.find({ farmer: req.params.farmerId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Feedback.countDocuments({ farmer: req.params.farmerId })
    ]);

    res.json({
        success: true,
        feedback,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
});
