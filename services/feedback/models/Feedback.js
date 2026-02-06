const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },

    // Snapshot data
    productName: { type: String, required: true },
    buyerName: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },

    // Review content
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true }
}, { timestamps: true });

// Indexes
feedbackSchema.index({ farmer: 1, createdAt: -1 });
feedbackSchema.index({ product: 1, createdAt: -1 });
feedbackSchema.index({ buyer: 1 });
feedbackSchema.index({ order: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
