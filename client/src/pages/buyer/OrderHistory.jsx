import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrders, verifyOTP } from '../../services/order.service';
import { useSocket } from '../../hooks/useSocket';
import LoadingSpinner from '../../components/shared/LoadingSpinner.jsx';
import Toast, { useToast } from '../../components/shared/Toast.jsx';
import './Buyer.css';

const OrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [otpModal, setOtpModal] = useState({ show: false, orderId: null, otp: '' });
    const { notifications } = useSocket();
    const { toasts, success, error } = useToast();

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        if (notifications.some(n => n.type === 'statusUpdate')) {
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

    const handleVerifyOTP = async () => {
        try {
            await verifyOTP(otpModal.orderId, otpModal.otp);
            success('Order verified successfully!');
            setOtpModal({ show: false, orderId: null, otp: '' });
            fetchOrders();
        } catch (err) {
            error(err.response?.data?.message || 'OTP verification failed');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'delivered': return 'success';
            case 'cancelled': return 'danger';
            case 'pending': return 'warning';
            default: return 'primary';
        }
    };

    if (loading) return <LoadingSpinner text="Loading orders..." />;

    return (
        <div className="orders-history-page">
            <Toast toasts={toasts} />
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">My Orders</h1>
                    <p className="page-subtitle">{orders.length} orders placed</p>
                </div>

                {orders.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📦</div>
                        <h3>No orders yet</h3>
                        <p>Start shopping to see your orders here</p>
                        <Link to="/buyer/browse" className="btn btn-primary">Browse Products</Link>
                    </div>
                ) : (
                    <div className="orders-list-buyer">
                        {orders.map(order => (
                            <div key={order._id} className="order-card card">
                                <div className="order-card-header">
                                    <div className="order-id">Order #{order._id.slice(-8)}</div>
                                    <span className={`badge badge-${getStatusColor(order.status)}`}>{order.status}</span>
                                </div>
                                <div className="order-card-body">
                                    <img src={order.productDetails?.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80'}
                                        alt="" className="order-product-image" />
                                    <div className="order-product-info">
                                        <h4>{order.productDetails?.name}</h4>
                                        <p>Quantity: {order.productDetails?.quantity} kg</p>
                                        <p>From: {order.farmerDetails?.name}</p>
                                    </div>
                                    <div className="order-price-info">
                                        <div className="order-total">₹{order.totalPrice}</div>
                                        <div className="order-date">{new Date(order.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="order-card-footer">
                                    {order.status === 'pending' && (
                                        <>
                                            <p className="otp-notice">Enter OTP from email to confirm order</p>
                                            <button onClick={() => setOtpModal({ show: true, orderId: order._id, otp: '' })}
                                                className="btn btn-primary">Verify OTP</button>
                                        </>
                                    )}
                                    {order.status === 'delivered' && !order.feedbackDone && (
                                        <Link to={`/buyer/feedback/${order._id}`} className="btn btn-secondary">Leave Review</Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {otpModal.show && (
                    <div className="modal-overlay" onClick={() => setOtpModal({ show: false, orderId: null, otp: '' })}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <h2>Verify Order</h2>
                            <p>Enter the OTP sent to your email</p>
                            <div className="form-group">
                                <input type="text" value={otpModal.otp}
                                    onChange={e => setOtpModal(prev => ({ ...prev, otp: e.target.value }))}
                                    className="form-input otp-input" placeholder="Enter 4-digit OTP" maxLength="4" />
                            </div>
                            <div className="modal-actions">
                                <button onClick={() => setOtpModal({ show: false, orderId: null, otp: '' })}
                                    className="btn btn-secondary">Cancel</button>
                                <button onClick={handleVerifyOTP} className="btn btn-primary">Verify</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderHistory;
