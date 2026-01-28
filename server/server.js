require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const { initializeSocket } = require('./services/socket.service');
const { verifyEmailConfig } = require('./services/email.service');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);


initializeSocket(server);


connectDB().then(async () => {
    
    await verifyEmailConfig();

    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    });
});


process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});
