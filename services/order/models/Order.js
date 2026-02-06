const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },

    // Embedded buyer details (snapshot at time of order)
    buyerDetails: {
        name: { type: String, required: true },
        phno: { type: Number, required: true },
        address: {
            city: { type: String, required: true },
            state: { type: String, required: true },
            pin: { type: String, required: true }
        },
        coordinates: [{ type: Number }]
    },

    // Embedded farmer details
    farmerDetails: {
        name: { type: String, required: true },
        phno: { type: Number, required: true },
        address: {
            city: { type: String, required: true },
            state: { type: String, required: true },
            pin: { type: String, required: true }
        }
    },

    // Order items (for multi-item orders)
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        description: { type: String },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        category: { type: String },
        image: { type: String },
        reviewed: { type: Boolean, default: false }
    }],

    // Legacy single product support
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productDetails: {
        name: String,
        price: Number,
        quantity: Number,
        image: String
    },

    totalPrice: { type: Number, required: true },

    // Order status
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },

    // Payment Info
    paymentMethod: {
        type: String,
        enum: ['online', 'cash'],
        default: 'cash'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    // OTP verification
    OTP: { type: String, required: true },

    // Delivery status
    shipping: { type: Boolean, default: false },
    delivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },

    // Feedback tracking
    feedbackDone: { type: Boolean, default: false },

    // Soft delete flags
    buyerDeleted: { type: Boolean, default: false },
    farmerDeleted: { type: Boolean, default: false },
    productDeleted: { type: Boolean, default: false },

    // Delivery optimization
    deliverySequence: {
        sequence: { type: Number, default: null },
        distanceFromPrevious: { type: Number, default: null },
        estimatedTimeFromPrevious: { type: Number, default: null }
    },
    optimizedAt: { type: Date, default: null }

}, { timestamps: true });

// Indexes for performance
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ farmer: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
// NEW: Compound indexes for payment-aware queries (revenue, dashboard)
orderSchema.index({ farmer: 1, status: 1, paymentStatus: 1 });
orderSchema.index({ farmer: 1, paymentMethod: 1, paymentStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
