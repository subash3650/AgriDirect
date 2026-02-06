import { createContext, useEffect, useState, useCallback, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext.jsx';

export const SocketContext = createContext();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
    const { user, isAuthenticated } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [orderUpdates, setOrderUpdates] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [pendingOrderCount, setPendingOrderCount] = useState(0);

    const fetchCounts = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch Unread Messages
            const msgRes = await fetch('/api/conversations/unread', { headers });
            const msgData = await msgRes.json();
            if (msgData.success) setUnreadCount(msgData.unreadCount);

            // Fetch Pending Orders (Farmer only)
            if (user?.role === 'farmer') {
                const orderRes = await fetch('/api/orders/pending-stats', { headers });
                const orderData = await orderRes.json();
                if (orderData.success) setPendingOrderCount(orderData.count);
            }
        } catch (err) {
            console.error('Failed to fetch counts:', err);
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const token = localStorage.getItem('token');
        const newSocket = io(SOCKET_URL, {
            auth: { token }
        });

        newSocket.on('connect', () => {
            setIsConnected(true);
            console.log('Socket connected');
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Socket disconnected');
        });

        setSocket(newSocket);

        if (user.profileId) {
            localStorage.setItem('userId', user.profileId);
        }

        if (user.role === 'farmer' && user.profileId) {
            newSocket.emit('joinFarmerRoom', user.profileId);
        } else if (user.role === 'buyer' && user.profileId) {
            newSocket.emit('joinBuyerRoom', user.profileId);
        }

        // --- Notification Listeners with Count Updates ---

        newSocket.on('newOrder', (data) => {
            setNotifications(prev => [...prev, { type: 'newOrder', ...data, timestamp: new Date() }]);
            if (user.role === 'farmer') {
                setPendingOrderCount(prev => prev + 1);
            }
        });

        newSocket.on('orderUpdated', (data) => {
            setOrderUpdates(prev => [...prev, data]);
        });

        newSocket.on('orderStatusUpdated', (data) => {
            setNotifications(prev => [...prev, { type: 'statusUpdate', ...data, timestamp: new Date() }]);
            // Refresh counts to stay accurate (simple way to handle status changes)
            if (user.role === 'farmer') fetchCounts();
        });

        newSocket.on('new_message', (data) => {
            // Increment unread if message is NOT from me
            if (data.message.senderId !== user.profileId) {
                setUnreadCount(prev => prev + 1);
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [isAuthenticated, user, fetchCounts]);

    const clearNotifications = useCallback(() => setNotifications([]), []);
    const refreshCounts = useCallback(() => fetchCounts(), [fetchCounts]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, notifications, orderUpdates, clearNotifications, unreadCount, pendingOrderCount, refreshCounts }}>
            {children}
        </SocketContext.Provider>
    );
};
