const mongoose = require('mongoose');

// Simplified Product Schema for Order Service context
// We only need the fields relevant for order creation and stock management references
const productSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    category: String,
    image: String,
    currentQuantity: { type: Number, required: true, default: 0 },
    allocatedQuantity: { type: Number, default: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    ownerName: String,
    state: String,
    city: String,
    pin: Number,
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// We use the existing collection 'products' from the database
module.exports = mongoose.model('Product', productSchema, 'products');
