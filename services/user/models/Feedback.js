const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
    productName: { type: String, required: true },
    buyerName: { type: String, required: true },
    image: String,
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
