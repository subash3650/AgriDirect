import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyOrders, verifyOTP } from '../../services/order.service';
import { useSocket } from '../../hooks/useSocket';
import LoadingSpinner from '../../components/shared/LoadingSpinner.jsx';
import Toast, { useToast } from '../../components/shared/Toast.jsx';
import api from '../../services/api'; 
import './Buyer.css';

const OrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [otpModal, setOtpModal] = useState({ show: false, orderId: null, otp: '' });

    
    const [reviewModal, setReviewModal] = useState({ show: false, orderId: null, productId: null, productName: '' });
    const [reviewData, setReviewData] = useState({ rating: 5, review: '' });

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

    
    const openReviewModal = (orderId, item) => {
        setReviewModal({
            show: true,
            orderId,
            productId: item.product?._id || item.product,
            productName: item.name
        });
        setReviewData({ rating: 5, review: '' });
    };

    
    const submitReview = async (e) => {
        e.preventDefault();
        try {
            
            await api.post('/feedback', {
                orderId: reviewModal.orderId,
                productId: reviewModal.productId,
                rating: parseInt(reviewData.rating),
                review: reviewData.review
            });

            success('Review submitted successfully!');
            setReviewModal({ show: false, orderId: null, productId: null, productName: '' });
            fetchOrders(); 
        } catch (err) {
            error(err.response?.data?.message || 'Failed to submit review');
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

            {}
            {reviewModal.show && (
                <div className="modal-overlay" onClick={() => setReviewModal({ show: false })}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Review {reviewModal.productName}</h2>
                        <form onSubmit={submitReview}>
                            <div className="form-group">
                                <label>Rating</label>
                                <select
                                    value={reviewData.rating}
                                    onChange={e => setReviewData({ ...reviewData, rating: e.target.value })}
                                    className="form-input"
                                >
                                    {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Your Review</label>
                                <textarea
                                    value={reviewData.review}
                                    onChange={e => setReviewData({ ...reviewData, review: e.target.value })}
                                    className="form-input"
                                    required
                                    rows="3"
                                    placeholder="Share your experience..."
                                ></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setReviewModal({ show: false })} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Submit Review</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                                    <div className="order-items-container">
                                        {order.items?.map((item, idx) => (
                                            <div key={idx} className="order-item-row">
                                                <div className="item-details-left">
                                                    <img src={item.image} alt={item.name} className="item-mini-thumb" />
                                                    <div className="item-text-info">
                                                        <span className="item-name">{item.name}</span>
                                                        <span className="item-meta">{item.quantity} kg x ₹{item.price}</span>
                                                    </div>
                                                </div>

                                                {}
                                                {order.status === 'delivered' && (
                                                    <div className="item-action">
                                                        {!item.reviewed ? (
                                                            <button
                                                                className="btn btn-sm btn-outline-primary"
                                                                onClick={() => openReviewModal(order._id, item)}
                                                            >
                                                                Write Review
                                                            </button>
                                                        ) : (
                                                            <span className="badge badge-success">✓ Reviewed</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="order-summary-divider"></div>

                                    <div className="order-price-info">
                                        <div className="order-total">Total: ₹{order.totalPrice}</div>
                                        <div className="order-farmer">Farmer: {order.farmerDetails?.name}</div>
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
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {}
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
