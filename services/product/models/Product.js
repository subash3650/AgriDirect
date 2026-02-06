const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
    currentQuantity: { type: Number, required: true, default: 0 },
    allocatedQuantity: { type: Number, default: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    ownerName: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    pin: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Index for searching
productSchema.index({ productName: 'text', description: 'text', category: 'text' });
productSchema.index({ category: 1, city: 1, state: 1 });
productSchema.index({ owner: 1 });
productSchema.index({ isActive: 1 });

// Virtual for available quantity
productSchema.virtual('availableQuantity').get(function () {
    return this.currentQuantity - this.allocatedQuantity;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
