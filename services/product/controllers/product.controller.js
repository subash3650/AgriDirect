const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const { AppError, asyncHandler } = require('../../shared/middleware/errorHandler');

exports.getProducts = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const products = await Product.find({ isActive: true, currentQuantity: { $gt: 0 } })
        .sort({ createdAt: -1 })
        .skip(startIndex)
        .limit(limit);

    const total = await Product.countDocuments({ isActive: true, currentQuantity: { $gt: 0 } });

    res.json({
        success: true,
        count: products.length,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        },
        products
    });
});

exports.getProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id).populate('owner', 'name email phno');
    if (!product) return next(new AppError('Product not found', 404));
    res.json({ success: true, product });
});

exports.getMyProducts = asyncHandler(async (req, res, next) => {
    const farmer = req.user;
    const products = await Product.find({ owner: farmer._id, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, products });
});

exports.createProduct = asyncHandler(async (req, res, next) => {
    const { productName, description, category, quantity, price, image } = req.body;
    const farmer = req.user;

    const product = await Product.create({
        owner: farmer._id,
        ownerName: farmer.name,
        productName,
        description,
        category,
        allocatedQuantity: quantity,
        currentQuantity: quantity,
        price,
        image: image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
        state: farmer.state,
        city: farmer.city,
        pin: farmer.pin
    });

    farmer.products = farmer.products || [];
    farmer.products.push(product._id);
    await farmer.save();

    res.status(201).json({ success: true, product });
});

exports.updateProduct = asyncHandler(async (req, res, next) => {
    const { productName, description, category, quantity, price, image, isActive } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError('Product not found', 404));

    if (product.owner.toString() !== req.user._id.toString()) return next(new AppError('Not authorized', 403));

    Object.assign(product, {
        ...(productName && { productName }), ...(description && { description }),
        ...(category && { category }), ...(quantity !== undefined && { allocatedQuantity: quantity, currentQuantity: quantity }),
        ...(price && { price }), ...(image && { image }), ...(isActive !== undefined && { isActive })
    });
    await product.save();

    res.json({ success: true, product });
});

exports.deleteProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError('Product not found', 404));

    if (product.owner.toString() !== req.user._id.toString()) return next(new AppError('Not authorized', 403));

    product.isActive = false;
    await product.save();

    res.json({ success: true, message: 'Product deleted' });
});
