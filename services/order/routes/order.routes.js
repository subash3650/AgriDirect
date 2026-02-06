const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const orderController = require('../controllers/order.controller');

const router = express.Router();

// Order routes matching original API
router.post('/', protect, authorize('buyer'), orderController.createOrder);
router.post('/:id/verify-otp', protect, authorize('buyer'), orderController.verifyOTP);
router.patch('/:id/status', protect, authorize('farmer'), orderController.updateOrderStatus);
router.put('/:id/cancel', protect, orderController.cancelOrder);
router.get('/my-orders', protect, orderController.getMyOrders);
router.get('/pending-stats', protect, orderController.getPendingStats);
router.get('/history', protect, orderController.getOrderHistory);
router.get('/:id', protect, orderController.getOrder);

module.exports = router;
