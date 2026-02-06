const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const productController = require('../controllers/product.controller');

const router = express.Router();

// Protected routes (must come BEFORE /:id to avoid matching 'my-products' as an id)
router.get('/my-products', protect, authorize('farmer'), productController.getMyProducts);

// Public routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);

// Protected routes (farmer only)
router.post('/', protect, authorize('farmer'), productController.createProduct);
router.put('/:id', protect, authorize('farmer'), productController.updateProduct);
router.delete('/:id', protect, authorize('farmer'), productController.deleteProduct);

module.exports = router;
