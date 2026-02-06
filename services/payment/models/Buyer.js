const mongoose = require('mongoose');

// Copy of Buyer schema for Payment Service reference
const buyerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phno: { type: String, required: true }
}, { timestamps: true });

buyerSchema.virtual('role').get(function () {
    return 'buyer';
});

buyerSchema.set('toJSON', { virtuals: true });
buyerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Buyer', buyerSchema);
