const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    // Order reference
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },

    // User references
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
    farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },

    // Payment details
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },

    // Payment method
    paymentMethod: {
        type: String,
        enum: ['online', 'cash'],
        required: true
    },

    // Razorpay fields (for online payments)
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    // Status
    status: {
        type: String,
        enum: ['pending', 'awaiting_confirmation', 'paid', 'rejected', 'failed', 'refunded', 'cancelled'],
        default: 'pending'
    },

    // UPI Payment Verification Fields
    paymentProof: {
        screenshotUrl: { type: String },
        transactionId: { type: String },
        notes: { type: String },
        uploadedAt: { type: Date },
        markedPaidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer' }
    },

    verificationDetails: {
        verifiedAt: { type: Date },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer' },
        rejectionReason: { type: String }
    },

    // Timestamps
    paidAt: { type: Date },
    failedAt: { type: Date },
    refundedAt: { type: Date },
    awaitingConfirmationAt: { type: Date }

}, { timestamps: true });

// Indexes
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ buyerId: 1 });
paymentSchema.index({ farmerId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ 'paymentProof.markedPaidBy': 1 });
paymentSchema.index({ 'verificationDetails.verifiedBy': 1 });

module.exports = mongoose.model('Payment', paymentSchema);
