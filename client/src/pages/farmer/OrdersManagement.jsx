import { useState, useEffect } from 'react';
import { getMyOrders, updateOrderStatus } from '../../services/order.service';
import { useSocket } from '../../hooks/useSocket';
import LoadingSpinner from '../../components/shared/LoadingSpinner.jsx';
import Toast, { useToast } from '../../components/shared/Toast.jsx';
import './Farmer.css';

const OrdersManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const { notifications } = useSocket();
    const { toasts, success, error } = useToast();

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        if (notifications.some(n => n.type === 'newOrder')) {
            fetchOrders();
        }
    }, [notifications]);

    const fetchOrders = async () => {
        try {
            const response = await getMyOrders();
            setOrders(response.data.orders || []);
        } catch (err) {
            error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (orderId, newStatus) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            success(`Order marked as ${newStatus}`);
            fetchOrders();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to update status');
        }
    };

    const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    if (loading) return <LoadingSpinner text="Loading orders..." />;

    return (
        <div className="orders-page">
            <Toast toasts={toasts} />
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Orders</h1>
                    <div className="filter-tabs">
                        {['all', 'pending', 'processing', 'shipped', 'delivered'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`filter-tab ${filter === f ? 'active' : ''}`}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <h3>No orders found</h3>
                        <p>{filter === 'all' ? 'You have no orders yet' : `No ${filter} orders`}</p>
                    </div>
                ) : (
                    <div className="orders-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Buyer</th>
                                    <th>Quantity</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(order => (
                                    <tr key={order._id}>
                                        <td>
                                            <div className="order-product-cell">
                                                <img src={order.productDetails?.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=50'}
                                                    alt="" className="order-product-img" />
                                                <span>{order.productDetails?.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div>{order.buyerDetails?.name}</div>
                                            <small>{order.buyerDetails?.phno}</small>
                                        </td>
                                        <td>{order.productDetails?.quantity} kg</td>
                                        <td className="price-cell">₹{order.totalPrice}</td>
                                        <td>
                                            <span className={`badge badge-${order.status === 'delivered' ? 'success' :
                                                order.status === 'cancelled' ? 'danger' :
                                                    order.status === 'pending' ? 'warning' : 'primary'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            {order.status === 'processing' && (
                                                <button onClick={() => handleStatusUpdate(order._id, 'shipped')}
                                                    className="btn btn-primary btn-sm">Ship</button>
                                            )}
                                            {order.status === 'shipped' && (
                                                <button onClick={() => handleStatusUpdate(order._id, 'delivered')}
                                                    className="btn btn-primary btn-sm">Deliver</button>
                                            )}
                                            {order.status === 'pending' && (
                                                <span className="pending-text">Awaiting OTP</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersManagement;
