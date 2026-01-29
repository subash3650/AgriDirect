const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
    optimizeDeliverySequence,
    saveSequenceToOrders,
    clearSequence,
    getActiveSequence
} = require('../controllers/optimization.controller');

const router = express.Router();

// All optimization routes are for farmers only
router.use(protect, authorize('farmer'));

// Optimize delivery sequence
router.post('/delivery-sequence', optimizeDeliverySequence);

// Save optimized sequence to orders
router.post('/save-sequence', saveSequenceToOrders);

// Clear sequence from orders
router.post('/clear-sequence', clearSequence);

// Get orders with active sequence
router.get('/active-sequence', getActiveSequence);

module.exports = router;
