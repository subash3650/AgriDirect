const Order = require('../models/Order');
const { AppError, asyncHandler } = require('../../shared/middleware/errorHandler');

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Nearest neighbor algorithm for route optimization
const optimizeRoute = (startPoint, orders) => {
    const unvisited = [...orders];
    const route = [];
    let current = startPoint;
    let totalDistance = 0;

    while (unvisited.length > 0) {
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
            const order = unvisited[i];
            const coords = order.buyerDetails?.coordinates || [0, 0];
            const distance = calculateDistance(
                current[1], current[0],
                coords[1], coords[0]
            );

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        }

        const nearest = unvisited.splice(nearestIndex, 1)[0];
        totalDistance += nearestDistance;

        route.push({
            order: nearest,
            distanceFromPrevious: nearestDistance,
            estimatedTime: Math.round(nearestDistance * 2) // ~30 km/h average
        });

        current = nearest.buyerDetails?.coordinates || [0, 0];
    }

    return { route, totalDistance };
};

// Optimize delivery routes for farmer
exports.optimizeDeliveryRoutes = asyncHandler(async (req, res, next) => {
    const farmerId = req.userId;

    // Get all pending/processing orders for this farmer
    // FIX: Changed 'shipping' to 'shipped' to match Order model enum
    const orders = await Order.find({
        farmer: farmerId,
        status: { $in: ['processing', 'shipped'] },
        delivered: false
    });

    if (orders.length === 0) {
        return res.json({
            success: true,
            message: 'No orders to optimize',
            route: [],
            totalDistance: 0
        });
    }

    // Get farmer's starting location (from first order's farmerDetails)
    const farmerCoords = orders[0]?.farmerDetails?.coordinates || [0, 0];

    // Optimize route
    const { route, totalDistance } = optimizeRoute(farmerCoords, orders);

    // Update orders with delivery sequence
    for (let i = 0; i < route.length; i++) {
        const item = route[i];
        await Order.findByIdAndUpdate(item.order._id, {
            deliverySequence: {
                sequence: i + 1,
                distanceFromPrevious: item.distanceFromPrevious,
                estimatedTimeFromPrevious: item.estimatedTime
            },
            optimizedAt: new Date()
        });
    }

    res.json({
        success: true,
        message: `Optimized route for ${route.length} orders`,
        route: route.map((item, index) => ({
            sequence: index + 1,
            orderId: item.order._id,
            buyerName: item.order.buyerDetails?.name,
            address: item.order.buyerDetails?.address,
            distanceFromPrevious: Math.round(item.distanceFromPrevious * 10) / 10,
            estimatedTime: item.estimatedTime
        })),
        totalDistance: Math.round(totalDistance * 10) / 10,
        estimatedTotalTime: route.reduce((sum, item) => sum + item.estimatedTime, 0)
    });
});

// Get optimized route for farmer
exports.getOptimizedRoute = asyncHandler(async (req, res) => {
    const farmerId = req.userId;

    const orders = await Order.find({
        farmer: farmerId,
        status: { $in: ['processing', 'shipping'] },
        delivered: false,
        'deliverySequence.sequence': { $ne: null }
    }).sort({ 'deliverySequence.sequence': 1 });

    res.json({
        success: true,
        route: orders.map(order => ({
            sequence: order.deliverySequence?.sequence,
            orderId: order._id,
            buyerName: order.buyerDetails?.name,
            address: order.buyerDetails?.address,
            status: order.status,
            totalPrice: order.totalPrice,
            distanceFromPrevious: order.deliverySequence?.distanceFromPrevious,
            estimatedTime: order.deliverySequence?.estimatedTimeFromPrevious
        }))
    });
});

module.exports = exports;
