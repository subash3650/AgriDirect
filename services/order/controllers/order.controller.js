const Order = require('../models/Order');
const Farmer = require('../models/Farmer');
const Buyer = require('../models/Buyer');
const Product = require('../models/Product'); // Use local model
const { AppError, asyncHandler } = require('../../shared/middleware/errorHandler');
const { sendOTP, sendOrderConfirmation, sendStatusUpdate } = require('../services/email.service');
const crypto = require('crypto');
const axios = require('axios');

// Helper: Generate numeric OTP
const generateOTP = (length) => {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < length; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
};

// Helper: Hash OTP
const hashOTP = (otp) => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

// Helper: Verify OTP
const verifyOTP = (inputOtp, storedHash) => {
    return hashOTP(inputOtp) === storedHash;
};

// Notify Farmer (Microservice communication)
const notifyFarmer = async (farmerId, type, data) => {
    try {
        await axios.post(`${process.env.COMMUNICATION_SERVICE}/api/notifications/farmer`, {
            farmerId,
            type,
            data
        });
    } catch (error) {
        console.error('Failed to notify farmer:', error.message);
    }
};

// Create new order
exports.createOrder = asyncHandler(async (req, res, next) => {
    const buyer = await Buyer.findById(req.user._id);

    if (!buyer) {
        return next(new AppError('Buyer not found', 404));
    }

    const { items, paymentMethod } = req.body;

    if (!items || items.length === 0) {
        return next(new AppError('No items in order', 400));
    }

    // Group items by farmer
    const ordersByFarmer = {};

    for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) {
            return next(new AppError(`Product not found: ${item.productId}`, 404));
        }

        if (product.currentQuantity < item.quantity) {
            return next(new AppError(`Insufficient quantity for ${product.productName}. Available: ${product.currentQuantity}`, 400));
        }

        const farmerId = product.owner.toString();
        if (!ordersByFarmer[farmerId]) {
            ordersByFarmer[farmerId] = {
                products: [],
                totalPrice: 0
            };
        }

        ordersByFarmer[farmerId].products.push({
            product: product,
            quantity: item.quantity
        });
        ordersByFarmer[farmerId].totalPrice += product.price * item.quantity;
    }

    const createdOrders = [];

    for (const farmerId in ordersByFarmer) {
        console.log(`[TRACE] Processing order for farmer: ${farmerId}`);
        const group = ordersByFarmer[farmerId];
        const farmer = await Farmer.findById(farmerId);

        if (!farmer) {
            console.error(`❌ Farmer not found: ${farmerId}. Skipping order group.`);
            continue;
        }

        const otp = generateOTP(4);
        console.log(`[TRACE] Generated OTP for ${farmer.name}`);
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
                address: { city: buyer.city, state: buyer.state, pin: buyer.pin ? buyer.pin.toString() : '' },
                coordinates: buyer.location?.coordinates || []
            },
            farmerDetails: { name: farmer.name, phno: farmer.phno, address: { city: farmer.city, state: farmer.state, pin: farmer.pin?.toString() } },
            totalPrice: group.totalPrice,
            OTP: hashOTP(otp),
            status: 'pending',
            paymentMethod: req.body.paymentMethod || 'cash',
            paymentStatus: 'pending'
        });

        console.log(`[TRACE] Order created in DB: ${order._id}`);

        buyer.orders = buyer.orders || [];
        buyer.orders.push(order._id);
        farmer.orders = farmer.orders || [];
        farmer.orders.push(order._id);
        createdOrders.push(order);

        console.log(`[TRACE] Sending OTP email to ${buyer.email}...`);
        const emailSent = await sendOTP(buyer.email, otp, {
            productName: `Order from ${farmer.name}`,
            quantity: group.products.length,
            totalPrice: group.totalPrice
        });
        console.log(`[TRACE] Email sent result: ${emailSent}`);

        if (!emailSent) {
            console.error(`⚠️ Failed to send OTP email to ${buyer.email}`);
        }

        if (order.paymentMethod === 'cash') {
            console.log(`[TRACE] Notifying farmer...`);
            notifyFarmer(farmer._id.toString(), 'newOrder', { orderId: order._id });
        }
    }

    // NEW: Check if any orders were actually created
    if (createdOrders.length === 0) {
        return next(new AppError('Failed to create order. No valid farmers found for products.', 400));
    }

    for (const farmerId in ordersByFarmer) {
        await Farmer.findByIdAndUpdate(farmerId, { $push: { orders: { $each: createdOrders.filter(o => o.farmer.toString() === farmerId).map(o => o._id) } } });
    }

    await buyer.save();

    console.log(`✅ Successfully created ${createdOrders.length} orders`);

    res.status(201).json({ success: true, message: 'Orders placed! Check email for OTPs.', orders: createdOrders });
});

exports.verifyOTP = asyncHandler(async (req, res, next) => {
    console.log(`[TRACE] Verifying OTP for order: ${req.params.id}`);
    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new AppError('Order not found', 404));
    }

    const buyer = req.user;

    if (order.buyer.toString() !== buyer._id.toString()) {
        return next(new AppError('Not authorized', 403));
    }

    console.log(`[TRACE] Input OTP: ${req.body.otp}`);
    console.log(`[TRACE] Stored Hash: ${order.OTP}`);

    // Robust verification
    const inputHash = hashOTP(req.body.otp);
    console.log(`[TRACE] Computed Hash: ${inputHash}`);

    if (inputHash !== order.OTP) {
        console.error('❌ OTP mismatch');
        return next(new AppError('Invalid OTP', 400));
    }

    if (order.status !== 'pending') {
        return next(new AppError('Order already verified', 400));
    }

    // Reduce stock quantities after successful OTP verification
    for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
            if (product.currentQuantity < item.quantity) {
                return next(new AppError(`Insufficient stock for ${item.name}. Available: ${product.currentQuantity}`, 400));
            }
            product.currentQuantity -= item.quantity;
            await product.save();
        }
    }

    order.status = 'confirmed'; // Confirmed after OTP
    order.paymentStatus = order.paymentMethod === 'cash' ? 'pending' : 'paid';
    await order.save();
    console.log(`✅ Order verified and status updated to confirmed`);

    // Send confirmation email
    await sendOrderConfirmation(buyer.email, order);

    // Notify farmer
    notifyFarmer(order.farmer.toString(), 'orderVerified', { orderId: order._id });

    res.json({ success: true, message: 'Order verified successfully', order });
});

exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new AppError('Order not found', 404));
    }

    // Verify farmer owns this order
    if (order.farmer.toString() !== req.user._id.toString()) {
        return next(new AppError('Not authorized to update this order', 403));
    }

    // Validate status transition
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return next(new AppError('Invalid status', 400));
    }

    order.status = status;
    if (status === 'delivered' && order.paymentMethod === 'cash') {
        order.paymentStatus = 'paid';
    }

    await order.save();

    // Notify buyer
    // In a real app, this would use the Notification Service or Email Service
    // For now, we'll just log it or send a simple email if we had buyer email
    const buyer = await Buyer.findById(order.buyer);
    if (buyer) {
        sendStatusUpdate(buyer.email, order, status);
    }

    res.json({ success: true, message: 'Order status updated', order });
});

exports.cancelOrder = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        return next(new AppError('Order not found', 404));
    }

    // Only buyer or farmer can cancel
    const isBuyer = order.buyer.toString() === req.user._id.toString();
    const isFarmer = order.farmer.toString() === req.user._id.toString();

    if (!isBuyer && !isFarmer) {
        return next(new AppError('Not authorized', 403));
    }

    if (['delivered', 'cancelled'].includes(order.status)) {
        return next(new AppError('Cannot cancel order in current status', 400));
    }

    const { reason } = req.body;

    order.status = 'cancelled';
    await order.save();

    // Restore stock if it was deducted (for verified orders)
    if (order.status === 'confirmed' || order.status === 'processing' || order.status === 'shipped') {
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { currentQuantity: item.quantity }
            });
        }
    }

    // Send cancellation message to the other party
    if (reason) {
        try {
            const cancelledBy = isBuyer ? 'buyer' : 'farmer';
            const otherPartyId = isBuyer ? order.farmer.toString() : order.buyer.toString();
            const otherPartyType = isBuyer ? 'farmer' : 'buyer';

            // Get the cancelling user's details
            let cancellingUser;
            if (isBuyer) {
                cancellingUser = await Buyer.findById(req.user._id);
            } else {
                cancellingUser = await Farmer.findById(req.user._id);
            }

            const cancelMessage = `❌ Order Cancelled\n\nOrder #${order._id.toString().substring(0, 8)} has been cancelled by the ${cancelledBy}.\n\nReason: ${reason}\n\nItems: ${order.items.map(i => i.name).join(', ')}\nTotal: ₹${order.totalPrice}`;

            // Call communication service to send message
            // First, find or create conversation
            const commServiceUrl = process.env.COMMUNICATION_SERVICE || 'http://localhost:5005';

            // Create conversation (will return existing if it exists)
            const convResponse = await axios.post(`${commServiceUrl}/api/conversations`, {
                recipientId: otherPartyId,
                recipientType: otherPartyType,
                initialMessage: cancelMessage
            }, {
                headers: {
                    'Authorization': req.headers.authorization,
                    'Content-Type': 'application/json'
                }
            });

            // If conversation existed and no initial message was sent, send the message separately
            if (convResponse.data.existing) {
                await axios.post(`${commServiceUrl}/api/conversations/${convResponse.data.conversation._id}/messages`, {
                    text: cancelMessage,
                    metadata: { type: 'order_cancelled', orderId: order._id }
                }, {
                    headers: {
                        'Authorization': req.headers.authorization,
                        'Content-Type': 'application/json'
                    }
                });
            }

            console.log(`[Order] Cancellation message sent to ${otherPartyType}: ${otherPartyId}`);
        } catch (error) {
            console.error('[Order] Failed to send cancellation message:', error.message);
            // Don't fail the cancellation if message fails - just log the error
        }
    }

    res.json({ success: true, message: 'Order cancelled', order });
});

exports.getMyOrders = asyncHandler(async (req, res, next) => {
    const filter = {};
    if (req.user.role === 'buyer') {
        filter.buyer = req.user._id;
    } else {
        filter.farmer = req.user._id;
    }

    const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .populate('items.product', 'name image price'); // Basic product details

    res.json({ success: true, count: orders.length, orders });
});

exports.getPendingStats = asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'farmer') {
        return next(new AppError('Not authorized', 403));
    }

    const pendingCount = await Order.countDocuments({
        farmer: req.user._id,
        status: 'pending'
    });

    res.json({ success: true, pendingCount });
});

exports.getOrderHistory = asyncHandler(async (req, res, next) => {
    // Similar to getMyOrders but maybe with different filtering or pagination
    const filter = {};
    if (req.user.role === 'buyer') {
        filter.buyer = req.user._id;
    } else {
        filter.farmer = req.user._id;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, orders });
});

exports.getOrder = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new AppError('Order not found', 404));
    }

    // Auth check
    if (order.buyer.toString() !== req.user._id.toString() && order.farmer.toString() !== req.user._id.toString()) {
        return next(new AppError('Not authorized', 403));
    }

    res.json({ success: true, order });
});
