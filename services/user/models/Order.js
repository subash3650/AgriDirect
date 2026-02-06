const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    buyerDetails: {
        name: String,
        phno: Number,
        address: { city: String, state: String, pin: String },
        coordinates: [Number]
    },
    farmerDetails: {
        name: String,
        phno: Number,
        address: { city: String, state: String, pin: String }
    },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        description: String,
        price: Number,
        quantity: Number,
        category: String,
        image: String,
        reviewed: { type: Boolean, default: false }
    }],
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productDetails: { name: String, price: Number, quantity: Number, image: String },
    totalPrice: { type: Number, required: true },
    // FIXED: Changed 'shipping' to 'shipped' to match order service
    status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    // ADDED: Payment fields to match order service
    paymentMethod: { type: String, enum: ['online', 'cash'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    OTP: String,
    shipping: { type: Boolean, default: false },
    delivered: { type: Boolean, default: false },
    deliveredAt: Date,
    feedbackDone: { type: Boolean, default: false },
    buyerDeleted: { type: Boolean, default: false },
    farmerDeleted: { type: Boolean, default: false },
    productDeleted: { type: Boolean, default: false },
    deliverySequence: { sequence: Number, distanceFromPrevious: Number, estimatedTimeFromPrevious: Number },
    optimizedAt: Date
}, { timestamps: true });

// Add indexes for performance (matching order service)
orderSchema.index({ farmer: 1, status: 1 });
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ farmer: 1, createdAt: -1 });
orderSchema.index({ farmer: 1, status: 1, paymentStatus: 1 });
orderSchema.index({ farmer: 1, paymentMethod: 1, paymentStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);

