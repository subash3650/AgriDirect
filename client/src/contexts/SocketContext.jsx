import { createContext, useEffect, useState, useCallback, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext.jsx';

export const SocketContext = createContext();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
    const { user, isAuthenticated } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [orderUpdates, setOrderUpdates] = useState([]);

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        if (user.role === 'farmer' && user.profileId) {
            newSocket.emit('joinFarmerRoom', user.profileId);
        } else if (user.role === 'buyer' && user.profileId) {
            newSocket.emit('joinBuyerRoom', user.profileId);
        }

        newSocket.on('newOrder', (data) => {
            setNotifications(prev => [...prev, { type: 'newOrder', ...data, timestamp: new Date() }]);
        });

        newSocket.on('orderUpdated', (data) => {
            setOrderUpdates(prev => [...prev, data]);
        });

        newSocket.on('orderStatusUpdated', (data) => {
            setNotifications(prev => [...prev, { type: 'statusUpdate', ...data, timestamp: new Date() }]);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [isAuthenticated, user]);

    const clearNotifications = useCallback(() => setNotifications([]), []);

    return (
        <SocketContext.Provider value={{ socket, notifications, orderUpdates, clearNotifications }}>
            {children}
        </SocketContext.Provider>
    );
};
