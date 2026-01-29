const Order = require('../models/Order');
const Farmer = require('../models/Farmer');
const { optimizeDeliveryRoute } = require('../services/optimization.service');
const { AppError, asyncHandler } = require('../middleware');

/**
 * Optimize delivery sequence for selected orders
 * POST /api/optimize/delivery-sequence
 */
exports.optimizeDeliverySequence = asyncHandler(async (req, res, next) => {
    const { orderIds, farmerLocation } = req.body;
    const farmer = req.user;

    // Validation
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length < 2) {
        return next(new AppError('Please select at least 2 orders to optimize', 400));
    }

    // Get farmer's location (use provided or default from profile)
    let startLocation;
    if (farmerLocation && Array.isArray(farmerLocation) && farmerLocation.length === 2) {
        startLocation = { coordinates: farmerLocation };
    } else if (farmer.location?.coordinates?.length === 2) {
        startLocation = { coordinates: farmer.location.coordinates };
    } else {
        return next(new AppError('Farmer location is required. Please update your profile or provide current location.', 400));
    }

    // Fetch orders belonging to this farmer
    const orders = await Order.find({
        _id: { $in: orderIds },
        farmer: farmer._id,
        status: { $in: ['processing', 'shipped'] } // Only optimizable orders
    });

    if (orders.length === 0) {
        return next(new AppError('No valid orders found for optimization', 404));
    }

    // Filter orders with valid coordinates
    const validOrders = orders.filter(order =>
        order.buyerDetails?.coordinates?.length === 2
    );

    if (validOrders.length < 2) {
        return next(new AppError('At least 2 orders with valid delivery coordinates are required', 400));
    }

    // Run optimization
    const result = optimizeDeliveryRoute(startLocation, validOrders);

    res.json({
        success: true,
        message: 'Delivery sequence optimized',
        data: {
            optimizedSequence: result.optimizedSequence,
            totalDistance: result.totalDistance,
            estimatedTotalTime: result.estimatedTotalTime,
            optimizedAt: result.optimizedAt,
            farmerLocation: startLocation.coordinates,
            ordersOptimized: validOrders.length,
            ordersSkipped: orders.length - validOrders.length
        }
    });
});

/**
 * Save optimized sequence to order documents
 * POST /api/optimize/save-sequence
 */
exports.saveSequenceToOrders = asyncHandler(async (req, res, next) => {
    const { sequenceData } = req.body;
    const farmer = req.user;

    if (!sequenceData || !Array.isArray(sequenceData) || sequenceData.length === 0) {
        return next(new AppError('Sequence data is required', 400));
    }

    const updates = [];
    const optimizedAt = new Date();

    for (const item of sequenceData) {
        const order = await Order.findOne({
            _id: item.orderId,
            farmer: farmer._id
        });

        if (order) {
            order.deliverySequence = {
                sequence: item.sequence,
                distanceFromPrevious: item.distanceFromPrevious,
                estimatedTimeFromPrevious: item.estimatedTimeFromPrevious
            };
            order.optimizedAt = optimizedAt;
            await order.save();
            updates.push(order._id);
        }
    }

    res.json({
        success: true,
        message: `Sequence saved for ${updates.length} orders`,
        data: {
            updatedOrders: updates,
            optimizedAt
        }
    });
});

/**
 * Clear delivery sequence from orders
 * POST /api/optimize/clear-sequence
 */
exports.clearSequence = asyncHandler(async (req, res, next) => {
    const { orderIds } = req.body;
    const farmer = req.user;

    if (!orderIds || !Array.isArray(orderIds)) {
        return next(new AppError('Order IDs are required', 400));
    }

    await Order.updateMany(
        {
            _id: { $in: orderIds },
            farmer: farmer._id
        },
        {
            $set: {
                'deliverySequence.sequence': null,
                'deliverySequence.distanceFromPrevious': null,
                'deliverySequence.estimatedTimeFromPrevious': null,
                optimizedAt: null
            }
        }
    );

    res.json({
        success: true,
        message: 'Delivery sequence cleared'
    });
});

/**
 * Get orders with active delivery sequence
 * GET /api/optimize/active-sequence
 */
exports.getActiveSequence = asyncHandler(async (req, res, next) => {
    const farmer = req.user;

    const orders = await Order.find({
        farmer: farmer._id,
        'deliverySequence.sequence': { $ne: null },
        status: { $in: ['processing', 'shipped'] }
    }).sort({ 'deliverySequence.sequence': 1 });

    res.json({
        success: true,
        data: {
            orders,
            count: orders.length
        }
    });
});
