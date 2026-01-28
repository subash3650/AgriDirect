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
    
    const farmer = req.user;

    
    const products = await Product.find({ owner: farmer._id, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, products });
});

exports.createProduct = asyncHandler(async (req, res, next) => {
    console.log('Creating product. Body:', req.body);
    const { productName, description, category, quantity, price, image } = req.body;

    const farmer = req.user; 

    try {
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
        console.log('Product created in DB:', product._id);

        farmer.products.push(product._id);
        await farmer.save();
        console.log('Product added to farmer profile');

        res.status(201).json({ success: true, product });
    } catch (error) {
        console.error('Error creating product:', error);
        next(error);
    }
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
