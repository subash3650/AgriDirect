const Order = require('../models/Order');
const Product = require('../models/Product');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const { sendOTP, sendOrderConfirmation, sendStatusUpdate } = require('../services/email.service');
const { notifyFarmer, notifyBuyer } = require('../services/socket.service');
const otpGenerator = require('../utils/otpGenerator');
const { AppError, asyncHandler } = require('../middleware');

exports.createOrder = asyncHandler(async (req, res, next) => {
    
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return next(new AppError('No items provided', 400));
    }

    const buyer = req.user;

    
    const productIds = items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== items.length) {
        return next(new AppError('One or more products not found', 404));
    }

    
    const ordersByFarmer = {};

    
    for (const item of items) {
        const product = products.find(p => p._id.toString() === item.productId);
        if (product.currentQuantity < item.quantity) {
            return next(new AppError(`Insufficient stock for ${product.productName}`, 400));
        }

        const farmerId = product.owner.toString();
        if (!ordersByFarmer[farmerId]) {
            ordersByFarmer[farmerId] = {
                farmerId,
                products: [],
                totalPrice: 0
            };
        }

        ordersByFarmer[farmerId].products.push({
            product,
            quantity: item.quantity
        });
        ordersByFarmer[farmerId].totalPrice += product.price * item.quantity;
    }

    const createdOrders = [];

    
    for (const farmerId in ordersByFarmer) {
        const group = ordersByFarmer[farmerId];
        const farmer = await Farmer.findById(farmerId);
        if (!farmer) continue; 

        const otp = otpGenerator.generate(4);
        const orderItems = group.products.map(p => ({
            product: p.product._id,
            name: p.product.productName,
            price: p.product.price,
            quantity: p.quantity,
            image: p.product.image,
            description: p.product.description,
            category: p.product.category
        }));

        const order = await Order.create({
            buyer: buyer._id,
            farmer: farmer._id,
            items: orderItems,
            buyerDetails: {
                name: buyer.name,
                phno: buyer.phno,
                address: { city: buyer.city, state: buyer.state, pin: buyer.pin?.toString() },
                coordinates: buyer.location?.coordinates || []
            },
            farmerDetails: { name: farmer.name, phno: farmer.phno, address: { city: farmer.city, state: farmer.state, pin: farmer.pin?.toString() } },
            totalPrice: group.totalPrice,
            OTP: otp,
            status: 'pending'
        });

        
        for (const p of group.products) {
            p.product.currentQuantity -= p.quantity;
            await p.product.save();
        }

        buyer.orders.push(order._id);
        farmer.orders.push(order._id);
        createdOrders.push(order);

        
        await sendOTP(buyer.email, otp, {
            productName: `Order from ${farmer.name}`,
            quantity: group.products.length,
            totalPrice: group.totalPrice
        });

        notifyFarmer(farmer._id.toString(), 'newOrder', { orderId: order._id });
    }

    
    for (const farmerId in ordersByFarmer) {
        await Farmer.findByIdAndUpdate(farmerId, { $push: { orders: { $each: createdOrders.filter(o => o.farmer.toString() === farmerId).map(o => o._id) } } });
    }

    await buyer.save();

    res.status(201).json({ success: true, message: 'Orders placed! Check email for OTPs.', orders: createdOrders });
});

exports.verifyOTP = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new AppError('Order not found', 404));
    }

    const buyer = req.user;

    if (order.buyer.toString() !== buyer._id.toString()) {
        return next(new AppError('Not authorized', 403));
    }

    if (order.OTP !== req.body.otp) {
        return next(new AppError('Invalid OTP', 400));
    }

    order.status = 'processing';
    await order.save();

    await sendOrderConfirmation(buyer.email, order);
    notifyFarmer(order.farmer.toString(), 'orderVerified', { orderId: order._id });

    res.json({ success: true, message: 'Order verified!' });
});

exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order not found', 404));

    const farmer = req.user;
    if (order.farmer.toString() !== farmer._id.toString()) return next(new AppError('Not authorized', 403));

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
    const user = req.user;

    if (user.role === 'farmer') {
        orders = await Order.find({ farmer: user._id }).sort({ createdAt: -1 });
    } else {
        orders = await Order.find({ buyer: user._id }).sort({ createdAt: -1 });
    }
    res.json({ success: true, count: orders.length, orders });
});

exports.getOrderHistory = asyncHandler(async (req, res) => {
    let orders;
    const user = req.user;

    if (user.role === 'farmer') {
        orders = await Order.find({ farmer: user._id, status: { $in: ['delivered', 'cancelled'] } }).sort({ createdAt: -1 });
    } else {
        orders = await Order.find({ buyer: user._id, status: { $in: ['delivered', 'cancelled'] } }).sort({ createdAt: -1 });
    }
    res.json({ success: true, count: orders.length, orders });
});

exports.getOrder = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order not found', 404));
    res.json({ success: true, order });
});
