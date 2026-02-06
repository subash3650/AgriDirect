const mongoose = require('mongoose');

// Buyer schema for Feedback Service
const buyerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: String,
    phno: { type: String },
    city: String,
    state: String,
    pin: { type: String }
}, { timestamps: true });

buyerSchema.virtual('role').get(function () { return 'buyer'; });
buyerSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Buyer', buyerSchema);
