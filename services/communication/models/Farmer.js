const mongoose = require('mongoose');

// Simplified schema matching Auth service
const farmerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional here as we verify token
    phno: { type: String, trim: true },
    city: String,
    state: String,
    pin: Number,
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
        address: { type: String, default: '' }
    }
}, { timestamps: true });

farmerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Farmer', farmerSchema);
