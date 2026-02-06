const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const farmerController = require('../controllers/farmer.controller');

const router = express.Router();

// PUBLIC ROUTES (no authentication required)
router.get('/public/:farmerId', farmerController.getPublicProfile);
router.get('/public/:farmerId/products', farmerController.getFarmerProducts);

// PROTECTED ROUTES (require authentication + farmer role)
router.use(protect, authorize('farmer'));
router.get('/dashboard', farmerController.getDashboard);
router.get('/profile', farmerController.getProfile);
router.put('/profile', farmerController.updateProfile);
router.get('/feedback', farmerController.getFeedback);
router.delete('/account', farmerController.deleteAccount);

module.exports = router;
