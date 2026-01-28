require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const { initializeSocket } = require('./services/socket.service');
const { verifyEmailConfig } = require('./services/email.service');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Connect to database and start server
connectDB().then(async () => {
    // Verify email configuration
    await verifyEmailConfig();

    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    });
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});
