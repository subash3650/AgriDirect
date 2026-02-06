const express = require('express');
const router = express.Router();
const buyerController = require('../controllers/buyer.controller');
const { protect, authorize } = require('../middleware/auth');

// All buyer routes require buyer authentication
router.use(protect, authorize('buyer'));

// Profile routes (matching original API structure)
router.get('/dashboard', buyerController.getDashboard);
router.get('/profile', buyerController.getProfile);
router.put('/profile', buyerController.updateProfile);

// Cart routes (matching original API structure)
router.get('/cart', buyerController.getCart);
router.post('/cart', buyerController.addToCart);
router.put('/cart/:productId', buyerController.updateCartItem);
router.delete('/cart/:productId', buyerController.removeFromCart);
router.delete('/cart', buyerController.clearCart);

// Account
router.delete('/account', buyerController.deleteAccount);

module.exports = router;
