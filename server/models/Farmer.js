const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phno: { type: Number, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    pin: { type: Number },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    feedback: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' }],
    totalOrders: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }
}, { timestamps: true });

farmerSchema.index({ userId: 1 });

module.exports = mongoose.model('Farmer', farmerSchema);
