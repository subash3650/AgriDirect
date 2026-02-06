const mongoose = require('mongoose');

// Order schema for Payment Service
// Must be consistent with Order Service for shared database
const orderSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },

    // Embedded details
    buyerDetails: {
        name: String,
        phno: String,
        address: { city: String, state: String, pin: String },
        coordinates: [Number]
    },
    farmerDetails: {
        name: String,
        phno: String,
        address: { city: String, state: String, pin: String }
    },

    // Order items
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: String,
        price: Number,
        quantity: Number,
        image: String,
        reviewed: { type: Boolean, default: false }
    }],

    totalPrice: { type: Number, required: true },

    // Status
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },

    // Payment fields (primary for this service)
    paymentMethod: { type: String, enum: ['online', 'cash'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    // OTP
    OTP: { type: String },

    // Delivery
    delivered: { type: Boolean, default: false },
    deliveredAt: Date,

    // Feedback
    feedbackDone: { type: Boolean, default: false }
}, { timestamps: true });

// Indexes for payment queries
orderSchema.index({ buyer: 1, paymentStatus: 1 });
orderSchema.index({ farmer: 1, paymentStatus: 1 });
orderSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model('Order', orderSchema);
