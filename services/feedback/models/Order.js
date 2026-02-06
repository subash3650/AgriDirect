const mongoose = require('mongoose');

// Order schema for Feedback Service
// Must be consistent with Order Service for shared database
const orderSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },

    // Embedded details (for display in feedback)
    buyerDetails: {
        name: String,
        phno: String,
        address: { city: String, state: String, pin: String }
    },
    farmerDetails: {
        name: String,
        phno: String,
        address: { city: String, state: String, pin: String }
    },

    // Order items with review tracking
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        image: String,
        reviewed: { type: Boolean, default: false }
    }],

    totalPrice: { type: Number },

    // Status
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },

    // Payment fields
    paymentMethod: { type: String, enum: ['online', 'cash'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },

    // Feedback tracking (primary for this service)
    feedbackDone: { type: Boolean, default: false }
}, { timestamps: true });

// Indexes for feedback queries
orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ farmer: 1, status: 1 });
orderSchema.index({ 'items.product': 1 });
orderSchema.index({ feedbackDone: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
