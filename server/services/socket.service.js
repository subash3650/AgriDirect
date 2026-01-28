const { Server } = require('socket.io');
let io;

const initializeSocket = (server) => {
    io = new Server(server, { cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', methods: ['GET', 'POST'] } });

    io.on('connection', (socket) => {
        socket.on('joinFarmerRoom', (farmerId) => socket.join(`farmer_${farmerId}`));
        socket.on('joinBuyerRoom', (buyerId) => socket.join(`buyer_${buyerId}`));
        socket.on('disconnect', () => { });
    });
};

const notifyFarmer = (farmerId, event, data) => { if (io) io.to(`farmer_${farmerId}`).emit(event, data); };
const notifyBuyer = (buyerId, event, data) => { if (io) io.to(`buyer_${buyerId}`).emit(event, data); };

module.exports = { initializeSocket, notifyFarmer, notifyBuyer };
