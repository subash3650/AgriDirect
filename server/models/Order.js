const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', default: null },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', default: null },

    
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
        name: String,
        price: Number,
        quantity: Number,
        image: String,
        description: String,
        category: String,
        reviewed: { type: Boolean, default: false }
    }],

    
    buyerDeleted: { type: Boolean, default: false },
    farmerDeleted: { type: Boolean, default: false },

    
    buyerDetails: {
        name: String,
        phno: Number,
        address: { city: String, state: String, pin: String },
        coordinates: { type: [Number], default: [] } 
    },
    farmerDetails: { name: String, phno: Number, address: { city: String, state: String, pin: String } },

    totalPrice: { type: Number, required: true },
    OTP: { type: String, required: true },
    status: { type: String, enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    shipping: { type: Boolean, default: false },
    delivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    feedbackDone: { type: Boolean, default: false },
    
    // Delivery sequence optimization fields
    deliverySequence: {
        sequence: { type: Number, default: null }, // 1, 2, 3...
        distanceFromPrevious: { type: Number, default: null }, // in km
        estimatedTimeFromPrevious: { type: Number, default: null } // in minutes
    },
    optimizedAt: { type: Date, default: null }
}, { timestamps: true });

orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ farmer: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
