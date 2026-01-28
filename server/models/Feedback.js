const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    buyerName: { type: String, required: true },
    productName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },
    price: { type: Number },
    quantity: { type: Number },
    image: { type: String }
}, { timestamps: true });

feedbackSchema.index({ product: 1 });
feedbackSchema.index({ farmer: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
