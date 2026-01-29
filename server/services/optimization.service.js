/**
 * Route Optimization Service
 * Implements Nearest Neighbor algorithm for delivery sequence optimization
 */

class RouteOptimizer {
    /**
     * @param {Object} startLocation - Farmer's current location { coordinates: [lng, lat] }
     * @param {Array} orderLocations - Array of { orderId, coordinates: [lng, lat], buyerName, address }
     */
    constructor(startLocation, orderLocations) {
        this.start = startLocation;
        this.points = orderLocations;
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     * @param {Array} coord1 - [longitude, latitude]
     * @param {Array} coord2 - [longitude, latitude]
     * @returns {Number} Distance in kilometers
     */
    calculateDistance(coord1, coord2) {
        if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) {
            return Infinity;
        }

        const [lng1, lat1] = coord1;
        const [lng2, lat2] = coord2;

        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return Math.round(distance * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Convert degrees to radians
     */
    toRad(deg) {
        return deg * (Math.PI / 180);
    }

    /**
     * Estimate travel time based on distance
     * Assumes average speed of 30 km/h for rural delivery + 10 min per stop
     * @param {Number} distance - Distance in km
     * @returns {Number} Estimated time in minutes
     */
    estimateTime(distance) {
        const avgSpeed = 30; // km/h
        const timePerStop = 10; // minutes for each delivery
        const travelTime = (distance / avgSpeed) * 60; // convert hours to minutes
        return Math.round(travelTime + timePerStop);
    }

    /**
     * Nearest Neighbor algorithm for route optimization
     * Finds the sequence that minimizes total travel distance
     * @returns {Array} Optimized sequence of orders
     */
    nearestNeighbor() {
        if (!this.points || this.points.length === 0) {
            return [];
        }

        const visited = [];
        const unvisited = [...this.points];
        let currentLocation = this.start.coordinates;
        let totalDistance = 0;

        while (unvisited.length > 0) {
            let nearestIndex = 0;
            let minDistance = this.calculateDistance(currentLocation, unvisited[0].coordinates);

            // Find nearest unvisited point
            for (let i = 1; i < unvisited.length; i++) {
                const distance = this.calculateDistance(currentLocation, unvisited[i].coordinates);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestIndex = i;
                }
            }

            // Get the nearest order
            const nextOrder = unvisited[nearestIndex];
            const estimatedTime = this.estimateTime(minDistance);

            // Add to visited with sequence info
            visited.push({
                orderId: nextOrder.orderId,
                sequence: visited.length + 1,
                distanceFromPrevious: minDistance,
                estimatedTimeFromPrevious: estimatedTime,
                buyerName: nextOrder.buyerName,
                buyerPhone: nextOrder.buyerPhone,
                address: nextOrder.address,
                coordinates: nextOrder.coordinates,
                totalPrice: nextOrder.totalPrice,
                items: nextOrder.items
            });

            totalDistance += minDistance;

            // Move to next location
            currentLocation = nextOrder.coordinates;

            // Remove from unvisited
            unvisited.splice(nearestIndex, 1);
        }

        return visited;
    }

    /**
     * Main optimization entry point
     * @returns {Object} { optimizedSequence, totalDistance, estimatedTotalTime }
     */
    optimize() {
        const optimizedSequence = this.nearestNeighbor();

        const totalDistance = optimizedSequence.reduce(
            (acc, order) => acc + (order.distanceFromPrevious || 0), 0
        );

        const estimatedTotalTime = optimizedSequence.reduce(
            (acc, order) => acc + (order.estimatedTimeFromPrevious || 0), 0
        );

        return {
            optimizedSequence,
            totalDistance: Math.round(totalDistance * 100) / 100,
            estimatedTotalTime,
            optimizedAt: new Date()
        };
    }
}

/**
 * Factory function to create optimizer
 * @param {Object} farmerLocation - { coordinates: [lng, lat] }
 * @param {Array} orders - Array of order documents
 * @returns {Object} Optimization result
 */
const optimizeDeliveryRoute = (farmerLocation, orders) => {
    // Transform orders to optimization format
    const orderLocations = orders.map(order => ({
        orderId: order._id,
        coordinates: order.buyerDetails?.coordinates || [],
        buyerName: order.buyerDetails?.name || 'Unknown',
        buyerPhone: order.buyerDetails?.phno || '',
        address: order.buyerDetails?.address || {},
        totalPrice: order.totalPrice,
        items: order.items
    }));

    const optimizer = new RouteOptimizer(farmerLocation, orderLocations);
    return optimizer.optimize();
};

module.exports = {
    RouteOptimizer,
    optimizeDeliveryRoute
};
