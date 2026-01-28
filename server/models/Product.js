const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    ownerName: { type: String, required: true },
    productName: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['Vegetables', 'Fruits', 'Grains', 'Dairy', 'Organic', 'Other'], required: true },
    allocatedQuantity: { type: Number, required: true },
    currentQuantity: { type: Number, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400' },
    state: { type: String },
    city: { type: String },
    pin: { type: Number },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ owner: 1 });

module.exports = mongoose.model('Product', productSchema);
