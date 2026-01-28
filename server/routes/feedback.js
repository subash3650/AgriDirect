const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { createFeedback, getProductFeedback, getFarmerFeedback } = require('../controllers/feedback.controller');
const router = express.Router();

router.post('/', protect, authorize('buyer'), createFeedback);
router.get('/product/:productId', getProductFeedback);
router.get('/farmer/:farmerId', getFarmerFeedback);

module.exports = router;
