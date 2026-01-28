const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const farmerSchema = new mongoose.Schema({

    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phno: { type: Number, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    pin: { type: Number },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], default: [] },
        address: { type: String, default: '' }
    },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    feedback: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Feedback' }],
    totalOrders: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }
}, { timestamps: true });


farmerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});


farmerSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

farmerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Farmer', farmerSchema);
