const express = require('express');
const router = express.Router();
const optimizationController = require('../controllers/optimization.controller');
const { protect, authorize } = require('../middleware/auth');

// All optimization routes require farmer authentication
router.use(protect);
router.use(authorize('farmer'));

// Optimize delivery routes
router.post('/routes', optimizationController.optimizeDeliveryRoutes);

// Get current optimized route
router.get('/routes', optimizationController.getOptimizedRoute);

module.exports = router;
