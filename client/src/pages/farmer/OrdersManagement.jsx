import { useState, useEffect } from 'react';
import { getMyOrders, updateOrderStatus, cancelOrder } from '../../services/order.service';
import { useSocket } from '../../hooks/useSocket';
import LoadingSpinner from '../../components/shared/LoadingSpinner.jsx';
import Toast, { useToast } from '../../components/shared/Toast.jsx';
import './Farmer.css';

const OrdersManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [cancelModal, setCancelModal] = useState({ show: false, orderId: null, reason: '' });
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

    const handleCancelOrder = async (e) => {
        e.preventDefault();
        try {
            await cancelOrder(cancelModal.orderId, cancelModal.reason);
            success('Order cancelled and buyer notified');
            setCancelModal({ show: false, orderId: null, reason: '' });
            fetchOrders();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to cancel order');
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
                                                <img src={order.items?.[0]?.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=50'}
                                                    alt="" className="order-product-img" />
                                                <span>{order.items?.map(i => i.name).join(', ')}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div>{order.buyerDetails?.name}</div>
                                            <small>{order.buyerDetails?.phno}</small>
                                        </td>
                                        <td>{order.items?.reduce((acc, i) => acc + i.quantity, 0)} kg</td>
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
                                                <div className="action-buttons">
                                                    <button onClick={() => handleStatusUpdate(order._id, 'shipped')}
                                                        className="btn btn-primary btn-sm">Ship</button>
                                                    <button onClick={() => setCancelModal({ show: true, orderId: order._id, reason: '' })}
                                                        className="btn btn-outline-danger btn-sm">Cancel</button>
                                                </div>
                                            )}
                                            {order.status === 'shipped' && (
                                                <div className="action-column">
                                                    <div className="action-buttons">
                                                        <button onClick={() => handleStatusUpdate(order._id, 'delivered')}
                                                            className="btn btn-primary btn-sm">Deliver</button>
                                                        {order.buyerDetails?.coordinates?.length === 2 && (
                                                            <a
                                                                href={`https://www.google.com/maps/dir/?api=1&destination=${order.buyerDetails.coordinates[1]},${order.buyerDetails.coordinates[0]}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="route-link"
                                                            >
                                                                Show Route 📍
                                                            </a>
                                                        )}
                                                        <button onClick={() => setCancelModal({ show: true, orderId: order._id, reason: '' })}
                                                            className="btn btn-outline-danger btn-sm">Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                            {order.status === 'pending' && (
                                                <div className="action-buttons">
                                                    <span className="pending-text">Awaiting OTP</span>
                                                    <button onClick={() => setCancelModal({ show: true, orderId: order._id, reason: '' })}
                                                        className="btn btn-outline-danger btn-sm">Cancel</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Cancel Modal */}
                {cancelModal.show && (
                    <div className="modal-overlay" onClick={() => setCancelModal({ show: false, orderId: null, reason: '' })}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <h2>Cancel Order</h2>
                            <p className="text-muted">Please provide a reason. This will be sent to the buyer via chat.</p>
                            <form onSubmit={handleCancelOrder}>
                                <div className="form-group">
                                    <label>Reason for Cancellation</label>
                                    <textarea
                                        value={cancelModal.reason}
                                        onChange={e => setCancelModal({ ...cancelModal, reason: e.target.value })}
                                        className="form-input"
                                        required
                                        rows="3"
                                        placeholder="E.g., Out of stock, Quality issue..."
                                    ></textarea>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" onClick={() => setCancelModal({ show: false, orderId: null, reason: '' })} className="btn btn-secondary">Keep Order</button>
                                    <button type="submit" className="btn btn-danger">Confirm Cancellation</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersManagement;
