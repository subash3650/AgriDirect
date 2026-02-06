const mongoose = require('mongoose');

const connectDB = async (mongoUri) => {
    try {
        const uri = mongoUri || process.env.MONGO_URI || 'mongodb://localhost:27017/agridirect';

        const conn = await mongoose.connect(uri, {
            // Mongoose 6+ doesn't need these options, but keeping for compatibility
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log('MongoDB Disconnected');
    } catch (error) {
        console.error(`Error disconnecting: ${error.message}`);
    }
};

module.exports = { connectDB, disconnectDB };
