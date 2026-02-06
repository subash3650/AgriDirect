const mongoose = require('mongoose');

// Farmer schema for Feedback Service
const farmerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: String,
    phno: { type: String },
    city: String,
    state: String,
    pin: { type: String },
    rating: { type: Number, default: 0 }
}, { timestamps: true });

farmerSchema.virtual('role').get(function () { return 'farmer'; });
farmerSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Farmer', farmerSchema);
