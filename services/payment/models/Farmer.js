const mongoose = require('mongoose');

// Copy of Farmer schema for Payment Service reference
const farmerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phno: { type: String, required: true },
    kycStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    walletBalance: { type: Number, default: 0 },
    upiId: { type: String, default: '' }
}, { timestamps: true });

farmerSchema.virtual('role').get(function () {
    return 'farmer';
});

farmerSchema.set('toJSON', { virtuals: true });
farmerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Farmer', farmerSchema);
