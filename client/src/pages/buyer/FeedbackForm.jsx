import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder } from '../../services/order.service';
import { createFeedback } from '../../services/user.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner.jsx';
import Toast, { useToast } from '../../components/shared/Toast.jsx';
import './Buyer.css';

const FeedbackForm = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState('');
    const { toasts, success, error } = useToast();

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const response = await getOrder(orderId);
                setOrder(response.data.order);
            } catch (err) {
                error('Order not found');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!review.trim()) {
            error('Please write a review');
            return;
        }
        setSubmitting(true);
        try {
            await createFeedback({ orderId, rating, review });
            success('Thank you for your feedback!');
            setTimeout(() => navigate('/buyer/orders'), 1500);
        } catch (err) {
            error(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!order) return <div className="empty-state"><h3>Order not found</h3></div>;

    return (
        <div className="feedback-page">
            <Toast toasts={toasts} />
            <div className="container">
                <div className="feedback-container card">
                    <h1>Leave a Review</h1>
                    <div className="feedback-product">
                        <img src={order.productDetails?.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80'}
                            alt="" className="feedback-product-img" />
                        <div>
                            <h3>{order.productDetails?.name}</h3>
                            <p>From {order.farmerDetails?.name}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="rating-selector">
                            <label>Your Rating</label>
                            <div className="stars">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button key={star} type="button" onClick={() => setRating(star)}
                                        className={`star-btn ${star <= rating ? 'active' : ''}`}>
                                        ⭐
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Your Review</label>
                            <textarea value={review} onChange={e => setReview(e.target.value)}
                                className="form-input" rows="4"
                                placeholder="Share your experience with this product..." />
                        </div>

                        <div className="feedback-actions">
                            <button type="button" onClick={() => navigate('/buyer/orders')}
                                className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default FeedbackForm;
