const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const farmerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    phno: { type: String, required: true, trim: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    pin: { type: Number, required: true },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] },
        address: { type: String, default: '' }
    },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    feedback: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' }],
    rating: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 }
}, { timestamps: true });

farmerSchema.index({ location: '2dsphere' });

farmerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 14);
    next();
});

farmerSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for role
farmerSchema.virtual('role').get(function () {
    return 'farmer';
});

farmerSchema.set('toJSON', { virtuals: true });
farmerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Farmer', farmerSchema);
