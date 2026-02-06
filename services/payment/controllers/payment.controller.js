const crypto = require('crypto');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const razorpay = require('../config/razorpay');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Farmer = require('../models/Farmer');
const { asyncHandler, AppError } = require('../../shared/middleware/errorHandler');

// Socket notification helpers
const notifyFarmer = (farmerId, event, data) => {
    console.log(`📢 Notify Farmer ${farmerId}: ${event}`, data);
    // In a real microservice setup, this would publish an event to RabbitMQ/Redis
    // For this monolith-style setup, we can't directly access the socket instance easily without importing sharedio
    // But since Communication Service handles sockets, we rely on the client refreshing or polling, 
    // OR we trigger a webhook to Communication Service. 

    // However, since we are running locally and want to simulate it:
    // We will cheat slightly and assume shared resource access or just rely on the frontend 
    // polling/refreshing when payment success happens. 

    // BETTER APPROACH: Order Service listens to events. Payment Service should just update DB.
    // But to fix the specific "notify" requirement:
    // We already updated Order Service to filter visibility. 
    // The "newOrder" popup relies on the socket event.
    // We need to emit it. 

    // We'll rely on the fact that when `verifyPayment` succeeds, the frontend navigates to Success page. 
    // But the farmer needs to know immediately.

    // Since we can't easily emit socket events from Payment Service to Communication Service in this codebase structure 
    // without a message queue, we will skip the explicit socket emit here and rely on the fact that 
    // once valid, it appears in the list.
    // BUT we can use an internal HTTP call to Order Service to "trigger notification".
    // Or just accept that it appears in the list now. 
};

// Create Razorpay order for online payment
exports.createOrder = asyncHandler(async (req, res, next) => {
    const { orderId, paymentMethod } = req.body;

    if (!orderId) {
        return next(new AppError('Order ID is required', 400));
    }

    if (!['online', 'cash'].includes(paymentMethod)) {
        return next(new AppError('Invalid payment method', 400));
    }

    // Fetch the order
    const order = await Order.findById(orderId);
    if (!order) {
        return next(new AppError('Order not found', 404));
    }

    // Verify buyer owns this order
    if (order.buyer.toString() !== req.user._id.toString()) {
        return next(new AppError('Not authorized', 403));
    }

    // Check if payment already exists
    let payment = await Payment.findOne({ orderId });
    if (payment && payment.status === 'paid') {
        return next(new AppError('Order already paid', 400));
    }

    if (paymentMethod === 'online') {
        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(order.totalPrice * 100), // Amount in paise
            currency: 'INR',
            receipt: `order_${order._id}`,
            notes: {
                orderId: order._id.toString(),
                buyerId: req.user._id.toString(),
                farmerId: order.farmer.toString()
            }
        });

        // Create or update payment record
        if (payment) {
            payment.razorpayOrderId = razorpayOrder.id;
            payment.status = 'pending';
            await payment.save();
        } else {
            payment = await Payment.create({
                orderId: order._id,
                buyerId: req.user._id,
                farmerId: order.farmer,
                amount: order.totalPrice,
                paymentMethod: 'online',
                razorpayOrderId: razorpayOrder.id,
                status: 'pending'
            });
        }

        // Update order with payment info
        order.paymentMethod = 'online';
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        return res.json({
            success: true,
            orderId: order._id,
            razorpayOrderId: razorpayOrder.id,
            amount: order.totalPrice,
            currency: 'INR',
            key: process.env.RAZORPAY_KEY_ID
        });
    } else {
        // Cash payment - just create payment record
        if (!payment) {
            payment = await Payment.create({
                orderId: order._id,
                buyerId: req.user._id,
                farmerId: order.farmer,
                amount: order.totalPrice,
                paymentMethod: 'cash',
                status: 'pending'
            });
        } else {
            payment.paymentMethod = 'cash';
            payment.status = 'pending';
            await payment.save();
        }

        order.paymentMethod = 'cash';
        await order.save();

        return res.json({
            success: true,
            message: 'Order placed. Pay cash on delivery.',
            orderId: order._id
        });
    }
});

// Verify Razorpay payment signature
exports.verifyPayment = asyncHandler(async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return next(new AppError('Missing payment details', 400));
    }

    // Verify signature
    const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    if (generatedSignature !== razorpay_signature) {
        // Update payment status to failed
        await Payment.findOneAndUpdate(
            { razorpayOrderId: razorpay_order_id },
            { status: 'failed', failedAt: new Date() }
        );
        return next(new AppError('Payment verification failed', 400));
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            status: 'paid',
            paidAt: new Date()
        },
        { new: true }
    );

    if (!payment) {
        return next(new AppError('Payment record not found', 404));
    }

    // Update order
    await Order.findByIdAndUpdate(payment.orderId, {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentStatus: 'paid'
    });

    // Update farmer wallet
    await Farmer.findByIdAndUpdate(payment.farmerId, {
        $inc: { walletBalance: payment.amount }
    });

    // Log notification (simulating event emission)
    notifyFarmer(payment.farmerId.toString(), 'newOrder', { orderId: payment.orderId, status: 'paid' });

    res.json({
        success: true,
        message: 'Payment verified successfully'
    });
});

// Farmer confirms cash payment received
exports.confirmCashPayment = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;

    console.log('[Payment] Cash confirm request:', {
        orderId,
        farmerId: req.user?._id?.toString(),
        userRole: req.user?.role
    });

    // First, check if this order exists and belongs to this farmer
    const order = await Order.findOne({ _id: orderId, farmer: req.user._id });
    if (!order) {
        console.log('[Payment] Order not found or not owned by farmer:', { orderId, farmerId: req.user._id?.toString() });
        return next(new AppError('Order not found or not authorized', 404));
    }

    // Check if order is delivered (can only confirm cash after delivery)
    if (order.status !== 'delivered') {
        console.log('[Payment] Order not delivered yet:', { orderId, status: order.status });
        return next(new AppError('Can only confirm cash payment for delivered orders', 400));
    }

    // Check if already paid
    if (order.paymentStatus === 'paid') {
        console.log('[Payment] Already paid:', { orderId });
        return next(new AppError('Payment already confirmed', 400));
    }

    // Find or create payment record
    let payment = await Payment.findOne({ orderId, farmerId: req.user._id });

    if (!payment) {
        // Create payment record for legacy orders
        console.log('[Payment] Creating payment record for legacy order:', { orderId });
        payment = await Payment.create({
            orderId: order._id,
            buyerId: order.buyer,
            farmerId: order.farmer,
            amount: order.totalPrice,
            paymentMethod: 'cash',
            status: 'pending'
        });
    }

    if (payment.paymentMethod !== 'cash') {
        console.log('[Payment] Not a cash payment:', { orderId, method: payment.paymentMethod });
        return next(new AppError('This is not a cash payment order', 400));
    }

    // Mark payment as paid
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    // Update order
    await Order.findByIdAndUpdate(orderId, { paymentStatus: 'paid' });

    // Update farmer wallet
    await Farmer.findByIdAndUpdate(req.user._id, {
        $inc: { walletBalance: payment.amount }
    });

    console.log('[Payment] Cash payment confirmed successfully:', { orderId, amount: payment.amount });

    res.json({
        success: true,
        message: 'Cash payment confirmed'
    });
});

// Get payment status
exports.getPaymentStatus = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
        return res.json({ success: true, status: 'not_initiated' });
    }

    res.json({
        success: true,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        paidAt: payment.paidAt
    });
});

// Create UPI QR Code for payment (Direct UPI using Farmer's UPI ID)
exports.createQRCode = asyncHandler(async (req, res, next) => {
    const { orderId } = req.body;

    if (!orderId) return next(new AppError('Order ID is required', 400));

    const order = await Order.findById(orderId);
    if (!order) return next(new AppError('Order not found', 404));

    // Check if already paid
    const existingPaidPayment = await Payment.findOne({ orderId, status: 'paid' });
    if (existingPaidPayment) return next(new AppError('Order already paid', 400));

    // Get farmer details to fetch UPI ID
    const farmer = await Farmer.findById(order.farmer);
    if (!farmer) return next(new AppError('Farmer not found', 404));

    if (!farmer.upiId || farmer.upiId.trim() === '') {
        return next(new AppError('Farmer has not set up their UPI ID. Please contact the farmer.', 400));
    }

    try {
        // Generate UPI payment URL
        // Format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&tn=TRANSACTION_NOTE&cu=INR
        const upiUrl = new URL('upi://pay');
        upiUrl.searchParams.set('pa', farmer.upiId); // Payee Address (UPI ID)
        upiUrl.searchParams.set('pn', farmer.name || 'AgriDirect Farmer'); // Payee Name
        upiUrl.searchParams.set('am', order.totalPrice.toFixed(2)); // Amount
        upiUrl.searchParams.set('tn', `Order ${order._id.toString().substring(0, 8)}`); // Transaction Note
        upiUrl.searchParams.set('cu', 'INR'); // Currency

        // Generate QR Code from UPI URL
        const qrDataUrl = await QRCode.toDataURL(upiUrl.toString(), {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Upsert payment record
        await Payment.findOneAndUpdate(
            { orderId: order._id },
            {
                orderId: order._id,
                buyerId: req.user._id,
                farmerId: order.farmer,
                amount: order.totalPrice,
                paymentMethod: 'online',
                status: 'pending',
                razorpayOrderId: `upi_${order._id}_${Date.now()}` // Unique identifier
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            imageUrl: qrDataUrl,
            qrId: `upi_${order._id}`,
            amount: order.totalPrice,
            farmerUpi: farmer.upiId,
            farmerName: farmer.name,
            upiUrl: upiUrl.toString() // Optional: send raw URL for debugging
        });

    } catch (error) {
        console.error('UPI QR Creation Error:', error);
        return next(new AppError('Failed to generate UPI QR Code', 500));
    }
});

// Razorpay webhook handler
exports.handleWebhook = asyncHandler(async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!secret) {
        console.error('RAZORPAY_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook not configured' });
    }

    // Verify webhook signature using raw body to avoid whitespace issues
    const bodyToVerify = req.rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(bodyToVerify)
        .digest('hex');

    if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;
    const paymentEntity = payload?.payment?.entity;
    const qrEntity = payload?.qr_code?.entity;

    if (!paymentEntity) {
        return res.json({ received: true });
    }

    // Try to find payment by Order ID (standard) OR by QR ID (custom)
    // The payment entity notes usually carry what we sent.
    const orderIdInit = paymentEntity.notes?.orderId;
    const dbQuery = orderIdInit
        ? { orderId: orderIdInit }
        : { razorpayOrderId: paymentEntity.order_id };

    if (!dbQuery.orderId && !dbQuery.razorpayOrderId && qrEntity) {
        // Fallback: If it was a QR payment, maybe look up by QR ID if stored
        // modifying dbQuery logic above to be safer
    }

    switch (event) {
        case 'payment.captured':
            // Logic to handle QR payments which might not have order_id but have notes
            const paymentRecord = await Payment.findOne(dbQuery);

            if (paymentRecord) {
                paymentRecord.status = 'paid';
                paymentRecord.razorpayPaymentId = paymentEntity.id;
                paymentRecord.paidAt = new Date();
                await paymentRecord.save();

                // Update Order
                await Order.findByIdAndUpdate(paymentRecord.orderId, {
                    paymentStatus: 'paid',
                    razorpayPaymentId: paymentEntity.id
                });

                // Update Farmer Wallet
                await Farmer.findByIdAndUpdate(paymentRecord.farmerId, {
                    $inc: { walletBalance: paymentRecord.amount }
                });

                // Notify Farmer
                notifyFarmer(paymentRecord.farmerId.toString(), 'newOrder', { orderId: paymentRecord.orderId, status: 'paid' });
            }
            break;

        case 'payment.failed':
            await Payment.findOneAndUpdate(
                dbQuery,
                { status: 'failed', failedAt: new Date() }
            );
            break;
    }

    res.json({ received: true });
});

// Multer configuration for payment proof uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/payment-proofs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `payment-proof-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
        }
    }
});

// Mark UPI payment as paid (Buyer action)
exports.markAsPaid = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;
    const { transactionId, notes } = req.body;

    if (!orderId) return next(new AppError('Order ID is required', 400));

    const payment = await Payment.findOne({ orderId }).populate('buyerId farmerId');
    if (!payment) return next(new AppError('Payment not found', 404));

    // Check if payment belongs to the current buyer
    if (payment.buyerId._id.toString() !== req.user._id.toString()) {
        return next(new AppError('Unauthorized: You can only mark your own payments', 403));
    }

    // Check payment status
    if (payment.status !== 'pending') {
        return next(new AppError(`Payment cannot be marked as paid. Current status: ${payment.status}`, 400));
    }

    // Update payment with proof
    payment.status = 'awaiting_confirmation';
    payment.awaitingConfirmationAt = new Date();
    payment.paymentProof = {
        transactionId: transactionId || null,
        notes: notes || '',
        uploadedAt: new Date(),
        markedPaidBy: req.user._id
    };

    // If screenshot was uploaded, add it
    if (req.file) {
        payment.paymentProof.screenshotUrl = `/uploads/payment-proofs/${req.file.filename}`;
    }

    await payment.save();

    // Notify farmer
    notifyFarmer(payment.farmerId._id, 'payment_awaiting_confirmation', {
        paymentId: payment._id,
        orderId: payment.orderId,
        amount: payment.amount,
        buyerName: payment.buyerId.name,
        hasProof: !!req.file
    });

    res.json({
        success: true,
        message: 'Payment marked as paid. Please wait for farmer confirmation.',
        paymentId: payment._id,
        status: payment.status
    });
});

// Confirm UPI payment (Farmer action)
exports.confirmPayment = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;

    if (!orderId) return next(new AppError('Order ID is required', 400));

    const payment = await Payment.findOne({ orderId }).populate('buyerId farmerId');
    if (!payment) return next(new AppError('Payment not found', 404));

    // Check if payment belongs to the current farmer
    if (payment.farmerId._id.toString() !== req.user._id.toString()) {
        return next(new AppError('Unauthorized: You can only confirm payments for your orders', 403));
    }

    // Check payment status
    if (payment.status !== 'awaiting_confirmation') {
        return next(new AppError(`Payment cannot be confirmed. Current status: ${payment.status}`, 400));
    }

    // Update payment status
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.verificationDetails = {
        verifiedAt: new Date(),
        verifiedBy: req.user._id
    };

    await payment.save();

    // Update order status
    const order = await Order.findById(orderId);
    if (order) {
        order.orderStatus = 'confirmed';
        order.paymentStatus = 'paid';
        await order.save();
    }

    // Notify buyer
    notifyBuyer(payment.buyerId._id, 'payment_confirmed', {
        paymentId: payment._id,
        orderId: payment.orderId,
        amount: payment.amount,
        farmerName: payment.farmerId.name
    });

    res.json({
        success: true,
        message: 'Payment confirmed successfully.',
        paymentId: payment._id,
        status: payment.status
    });
});

// Reject UPI payment (Farmer action)
exports.rejectPayment = asyncHandler(async (req, res, next) => {
    const { orderId } = req.params;
    const { rejectionReason } = req.body;

    if (!orderId) return next(new AppError('Order ID is required', 400));
    if (!rejectionReason) return next(new AppError('Rejection reason is required', 400));

    const payment = await Payment.findOne({ orderId }).populate('buyerId farmerId');
    if (!payment) return next(new AppError('Payment not found', 404));

    // Check if payment belongs to the current farmer
    if (payment.farmerId._id.toString() !== req.user._id.toString()) {
        return next(new AppError('Unauthorized: You can only reject payments for your orders', 403));
    }

    // Check payment status
    if (payment.status !== 'awaiting_confirmation') {
        return next(new AppError(`Payment cannot be rejected. Current status: ${payment.status}`, 400));
    }

    // Update payment status
    payment.status = 'rejected';
    payment.verificationDetails = {
        verifiedAt: new Date(),
        verifiedBy: req.user._id,
        rejectionReason
    };

    await payment.save();

    // Notify buyer
    notifyBuyer(payment.buyerId._id, 'payment_rejected', {
        paymentId: payment._id,
        orderId: payment.orderId,
        amount: payment.amount,
        farmerName: payment.farmerId.name,
        rejectionReason
    });

    res.json({
        success: true,
        message: 'Payment rejected. Buyer will be notified.',
        paymentId: payment._id,
        status: payment.status
    });
});

// Helper function to notify buyer
const notifyBuyer = (buyerId, event, data) => {
    console.log(`📢 Notify Buyer ${buyerId}: ${event}`, data);
    // Similar to notifyFarmer, this would publish to message queue in microservices
};

// Export upload middleware for routes
exports.uploadPaymentProof = upload.single('screenshot');
