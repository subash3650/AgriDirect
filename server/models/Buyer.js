const mongoose = require('mongoose');

const buyerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phno: { type: Number, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    pin: { type: Number },
    cart: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1 },
        price: { type: Number }
    }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' }]
}, { timestamps: true });

buyerSchema.index({ userId: 1 });

module.exports = mongoose.model('Buyer', buyerSchema);
