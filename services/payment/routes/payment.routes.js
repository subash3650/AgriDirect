const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

// Create payment order (Buyer)
router.post('/create-order', protect, authorize('buyer'), paymentController.createOrder);

// Create QR Code (Buyer)
router.post('/create-qr', protect, authorize('buyer'), paymentController.createQRCode);

// Verify Razorpay payment (Buyer)
router.post('/verify', protect, authorize('buyer'), paymentController.verifyPayment);

// Confirm cash payment (Farmer)
router.post('/cash-confirm/:orderId', protect, authorize('farmer'), paymentController.confirmCashPayment);

// UPI Payment Verification Flow
// Mark UPI payment as paid (Buyer)
router.post('/mark-paid/:orderId', 
    protect, 
    authorize('buyer'), 
    paymentController.uploadPaymentProof,
    paymentController.markAsPaid
);

// Confirm UPI payment (Farmer)
router.post('/confirm-upi/:orderId', protect, authorize('farmer'), paymentController.confirmPayment);

// Reject UPI payment (Farmer)
router.post('/reject-upi/:orderId', protect, authorize('farmer'), paymentController.rejectPayment);

// Get payment status
router.get('/status/:orderId', protect, paymentController.getPaymentStatus);

// Razorpay webhook (no auth - uses signature verification, raw body handled in server.js)
router.post('/webhook/razorpay', paymentController.handleWebhook);

module.exports = router;
