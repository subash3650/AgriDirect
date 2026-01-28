const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { createOrder, verifyOTP, updateOrderStatus, getMyOrders, getOrderHistory, getOrder } = require('../controllers/order.controller');
const router = express.Router();

router.post('/', protect, authorize('buyer'), createOrder);
router.post('/:id/verify-otp', protect, authorize('buyer'), verifyOTP);
router.patch('/:id/status', protect, authorize('farmer'), updateOrderStatus);
router.get('/my-orders', protect, getMyOrders);
router.get('/history', protect, getOrderHistory);
router.get('/:id', protect, getOrder);

module.exports = router;
