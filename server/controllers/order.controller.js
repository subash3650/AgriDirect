const Order = require('../models/Order');
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const { sendOTP, sendOrderConfirmation, sendStatusUpdate } = require('../services/email.service');
const { notifyFarmer, notifyBuyer } = require('../services/socket.service');
const otpGenerator = require('../utils/otpGenerator');
const { AppError, asyncHandler } = require('../middleware');

exports.createOrder = asyncHandler(async (req, res, next) => {
    console.log('\n[ORDER] Creating new order...');
    console.log('[ORDER] Request body:', req.body);
    console.log('[ORDER] User ID:', req.user._id);

    const { productId, quantity } = req.body;

    const buyer = await Buyer.findOne({ userId: req.user._id });
    console.log('[ORDER] Buyer found:', buyer ? `${buyer.name} (${buyer.email})` : 'NOT FOUND');

    if (!buyer) {
        console.error('[ORDER] ❌ Buyer not found for user:', req.user._id);
        return next(new AppError('Buyer profile not found', 404));
    }

    const product = await Product.findById(productId);
    console.log('[ORDER] Product:', product ? product.productName : 'NOT FOUND');

    if (!product || product.currentQuantity < quantity) {
        console.error('[ORDER] ❌ Product unavailable');
        return next(new AppError('Product unavailable', 400));
    }

    const farmer = await Farmer.findById(product.owner);
    console.log('[ORDER] Farmer:', farmer ? farmer.name : 'NOT FOUND');

    const otp = otpGenerator.generate(4);
    console.log('[ORDER] Generated OTP:', otp);

    const order = await Order.create({
        buyer: buyer._id, farmer: farmer._id, product: product._id,
        productDetails: { name: product.productName, price: product.price, quantity, image: product.image },
        buyerDetails: { name: buyer.name, phno: buyer.phno, address: { city: buyer.city, state: buyer.state, pin: buyer.pin?.toString() } },
        farmerDetails: { name: farmer.name, phno: farmer.phno, address: { city: farmer.city, state: farmer.state, pin: farmer.pin?.toString() } },
        totalPrice: product.price * quantity, OTP: otp, status: 'pending'
    });
    console.log('[ORDER] Order created:', order._id);

    product.currentQuantity -= quantity;
    await product.save();
    buyer.orders.push(order._id);
    await buyer.save();
    farmer.orders.push(order._id);
    await farmer.save();

    console.log('[ORDER] Sending OTP email to:', buyer.email);
    const emailSent = await sendOTP(buyer.email, otp, {
        productName: product.productName,
        quantity,
        totalPrice: product.price * quantity
    });
    console.log('[ORDER] Email sent result:', emailSent);

    notifyFarmer(farmer._id.toString(), 'newOrder', { orderId: order._id });

    console.log('[ORDER] ✅ Order creation complete');
    res.status(201).json({ success: true, message: 'Order placed! OTP sent to email.', order: { id: order._id, status: order.status } });
});

exports.verifyOTP = asyncHandler(async (req, res, next) => {
    console.log('\n[VERIFY OTP] Starting verification...');
    console.log('[VERIFY OTP] Order ID:', req.params.id);
    console.log('[VERIFY OTP] Request body:', req.body);
    console.log('[VERIFY OTP] User ID:', req.user._id);

    const order = await Order.findById(req.params.id);
    if (!order) {
        console.error('[VERIFY OTP] ❌ Order not found');
        return next(new AppError('Order not found', 404));
    }
    console.log('[VERIFY OTP] Order found, status:', order.status);
    console.log('[VERIFY OTP] Stored OTP:', order.OTP);
    console.log('[VERIFY OTP] Submitted OTP:', req.body.otp);

    const buyer = await Buyer.findOne({ userId: req.user._id });
    if (!buyer) {
        console.error('[VERIFY OTP] ❌ Buyer not found');
        return next(new AppError('Buyer not found', 404));
    }
    console.log('[VERIFY OTP] Buyer:', buyer.name);

    if (order.buyer.toString() !== buyer._id.toString()) {
        console.error('[VERIFY OTP] ❌ Not authorized - buyer mismatch');
        return next(new AppError('Not authorized', 403));
    }

    if (order.OTP !== req.body.otp) {
        console.error('[VERIFY OTP] ❌ Invalid OTP');
        console.error('[VERIFY OTP] Expected:', order.OTP, 'Got:', req.body.otp);
        return next(new AppError('Invalid OTP', 400));
    }

    order.status = 'processing';
    await order.save();
    console.log('[VERIFY OTP] ✅ Order status updated to processing');

    await sendOrderConfirmation(buyer.email, order);
    notifyFarmer(order.farmer.toString(), 'orderVerified', { orderId: order._id });

    console.log('[VERIFY OTP] ✅ Verification complete');
    res.json({ success: true, message: 'Order verified!' });
});

exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order not found', 404));

    const farmer = await Farmer.findOne({ userId: req.user._id });
    if (!farmer || order.farmer.toString() !== farmer._id.toString()) return next(new AppError('Not authorized', 403));

    order.status = req.body.status;
    if (req.body.status === 'delivered') { order.delivered = true; order.deliveredAt = new Date(); }
    await order.save();

    const buyer = await Buyer.findById(order.buyer);
    if (buyer) await sendStatusUpdate(buyer.email, order, req.body.status);
    notifyBuyer(order.buyer.toString(), 'orderStatusUpdated', { orderId: order._id, status: req.body.status });

    res.json({ success: true, message: `Order ${req.body.status}` });
});

exports.getMyOrders = asyncHandler(async (req, res) => {
    let orders;
    if (req.user.role === 'farmer') {
        const farmer = await Farmer.findOne({ userId: req.user._id });
        orders = await Order.find({ farmer: farmer._id }).sort({ createdAt: -1 });
    } else {
        const buyer = await Buyer.findOne({ userId: req.user._id });
        orders = await Order.find({ buyer: buyer._id }).sort({ createdAt: -1 });
    }
    res.json({ success: true, count: orders.length, orders });
});

exports.getOrderHistory = asyncHandler(async (req, res) => {
    let orders;
    if (req.user.role === 'farmer') {
        const farmer = await Farmer.findOne({ userId: req.user._id });
        orders = await Order.find({ farmer: farmer._id, status: { $in: ['delivered', 'cancelled'] } }).sort({ createdAt: -1 });
    } else {
        const buyer = await Buyer.findOne({ userId: req.user._id });
        orders = await Order.find({ buyer: buyer._id, status: { $in: ['delivered', 'cancelled'] } }).sort({ createdAt: -1 });
    }
    res.json({ success: true, count: orders.length, orders });
});

exports.getOrder = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order not found', 404));
    res.json({ success: true, order });
});
