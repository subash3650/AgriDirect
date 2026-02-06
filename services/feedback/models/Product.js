const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
    productName: String, price: Number, rating: { type: Number, default: 0 }, totalReviews: { type: Number, default: 0 }
}, { timestamps: true });
module.exports = mongoose.model('Product', productSchema);
