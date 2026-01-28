const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { getProducts, getProduct, getMyProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/product.controller');
const router = express.Router();

router.get('/', getProducts);
router.get('/my-products', protect, authorize('farmer'), getMyProducts);
router.get('/:id', getProduct);
router.post('/', protect, authorize('farmer'), createProduct);
router.put('/:id', protect, authorize('farmer'), updateProduct);
router.delete('/:id', protect, authorize('farmer'), deleteProduct);

module.exports = router;
