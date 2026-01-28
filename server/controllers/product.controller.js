const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const { AppError, asyncHandler } = require('../middleware');

exports.getProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({ isActive: true, currentQuantity: { $gt: 0 } }).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, products });
});

exports.getProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id).populate('owner', 'name email phno');
    if (!product) return next(new AppError('Product not found', 404));
    res.json({ success: true, product });
});

exports.getMyProducts = asyncHandler(async (req, res, next) => {
    const farmer = await Farmer.findOne({ userId: req.user._id });
    if (!farmer) return next(new AppError('Farmer not found', 404));
    const products = await Product.find({ owner: farmer._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, products });
});

exports.createProduct = asyncHandler(async (req, res, next) => {
    const { productName, description, category, quantity, price, image } = req.body;
    const farmer = await Farmer.findOne({ userId: req.user._id });
    if (!farmer) return next(new AppError('Farmer not found', 404));

    const product = await Product.create({
        owner: farmer._id, ownerName: farmer.name, productName, description, category,
        allocatedQuantity: quantity, currentQuantity: quantity, price, image,
        state: farmer.state, city: farmer.city, pin: farmer.pin
    });
    farmer.products.push(product._id);
    await farmer.save();
    res.status(201).json({ success: true, product });
});

exports.updateProduct = asyncHandler(async (req, res, next) => {
    const { productName, description, category, quantity, price, image, isActive } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError('Product not found', 404));

    const farmer = await Farmer.findOne({ userId: req.user._id });
    if (!farmer || product.owner.toString() !== farmer._id.toString()) return next(new AppError('Not authorized', 403));

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

    const farmer = await Farmer.findOne({ userId: req.user._id });
    if (!farmer || product.owner.toString() !== farmer._id.toString()) return next(new AppError('Not authorized', 403));

    product.isActive = false;
    await product.save();
    res.json({ success: true, message: 'Product deleted' });
});
