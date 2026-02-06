const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const feedbackController = require('../controllers/feedback.controller');

const router = express.Router();

// Public routes
router.get('/product/:productId', feedbackController.getProductFeedback);
router.get('/farmer/:farmerId', feedbackController.getFarmerFeedback);

// Protected route (buyer only)
router.post('/', protect, authorize('buyer'), feedbackController.createFeedback);

module.exports = router;
