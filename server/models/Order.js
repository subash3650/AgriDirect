const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productDetails: {
        name: String, price: Number, quantity: Number, image: String, description: String, category: String
    },
    buyerDetails: { name: String, phno: Number, address: { city: String, state: String, pin: String } },
    farmerDetails: { name: String, phno: Number, address: { city: String, state: String, pin: String } },
    totalPrice: { type: Number, required: true },
    OTP: { type: String, required: true },
    status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    shipping: { type: Boolean, default: false },
    delivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    feedbackDone: { type: Boolean, default: false }
}, { timestamps: true });

orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ farmer: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
