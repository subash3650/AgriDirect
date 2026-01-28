const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { getDashboard, getProfile, updateProfile, getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('../controllers/buyer.controller');
const router = express.Router();

router.use(protect, authorize('buyer'));
router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/cart', getCart);
router.post('/cart', addToCart);
router.put('/cart/:productId', updateCartItem);
router.delete('/cart/:productId', removeFromCart);
router.delete('/cart', clearCart);

module.exports = router;
