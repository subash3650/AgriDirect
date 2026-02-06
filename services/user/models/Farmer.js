const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const farmerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    phno: { type: Number, required: true },
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
    totalOrders: { type: Number, default: 0 },

    // KYC & Payment fields
    kycStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    bankDetails: {
        accountNumber: { type: String },
        ifscCode: { type: String },
        accountHolderName: { type: String }
    },
    acceptsCash: { type: Boolean, default: true },
    walletBalance: { type: Number, default: 0 },
    upiId: { type: String, default: '' } // Farmer's UPI VPA for direct payments
}, { timestamps: true });

farmerSchema.index({ location: '2dsphere' });

farmerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

farmerSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

farmerSchema.virtual('role').get(function () {
    return 'farmer';
});

farmerSchema.set('toJSON', { virtuals: true });
farmerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Farmer', farmerSchema);
