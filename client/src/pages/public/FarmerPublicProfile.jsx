import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import ChatModal from '../../components/chat/ChatModal';
import './Public.css';

const FarmerPublicProfile = () => {
    const { farmerId } = useParams();
    const { user, isAuthenticated } = useAuth();
    const { addToCart } = useCart();
    const navigate = useNavigate();

    const [farmer, setFarmer] = useState(null);
    const [products, setProducts] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [addingToCart, setAddingToCart] = useState({});

    useEffect(() => {
        const fetchFarmerProfile = async () => {
            try {
                const response = await fetch(`/api/farmers/public/${farmerId}`);
                const data = await response.json();

                if (data.success) {
                    setFarmer(data.farmer);
                    setProducts(data.products);
                    setReviews(data.reviews || []);
                } else {
                    setError(data.message || 'Failed to load farmer profile');
                }
            } catch (err) {
                setError('Failed to load farmer profile');
            } finally {
                setLoading(false);
            }
        };

        fetchFarmerProfile();
    }, [farmerId]);

    const handleAddToCart = async (product) => {
        if (!isAuthenticated) {
            navigate('/auth/login');
            return;
        }

        setAddingToCart(prev => ({ ...prev, [product._id]: true }));
        try {
            await addToCart(product, 1);
        } catch (err) {
            console.error('Failed to add to cart:', err);
        } finally {
            setAddingToCart(prev => ({ ...prev, [product._id]: false }));
        }
    };

    const handleMessageFarmer = () => {
        if (!isAuthenticated) {
            navigate('/auth/login');
            return;
        }
        setShowChat(true);
    };

    const renderStars = (rating) => {
        return '⭐'.repeat(Math.round(rating || 0)) || 'No ratings yet';
    };

    if (loading) {
        return (
            <div className="public-profile-page">
                <div className="container">
                    <div className="loading-state">Loading farmer profile...</div>
                </div>
            </div>
        );
    }

    if (error || !farmer) {
        return (
            <div className="public-profile-page">
                <div className="container">
                    <div className="error-state">
                        <h2>😕 Farmer Not Found</h2>
                        <p>{error || 'This farmer profile does not exist.'}</p>
                        <Link to="/buyer/browse" className="btn btn-primary">Browse Products</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="public-profile-page">
            <div className="container">
                {/* Back Navigation */}
                <button onClick={() => navigate(-1)} className="back-btn">
                    ← Back
                </button>

                {/* Farmer Header */}
                <div className="farmer-header card">
                    <div className="farmer-avatar">
                        🧑‍🌾
                    </div>
                    <div className="farmer-info">
                        <h1>{farmer.name}</h1>
                        <p className="farmer-location">📍 {farmer.city}, {farmer.state}</p>
                        <div className="farmer-stats">
                            <span className="stat">
                                {renderStars(farmer.rating)} ({farmer.totalOrders || 0} orders)
                            </span>
                            <span className="stat">🌾 {farmer.productsCount} Products</span>
                            <span className="stat">📅 Joined {new Date(farmer.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button onClick={handleMessageFarmer} className="btn btn-secondary message-btn">
                            💬 Message Farmer
                        </button>
                    </div>
                </div>

                {/* Products Section */}
                <section className="products-section">
                    <h2>Products from {farmer.name}</h2>
                    {products.length === 0 ? (
                        <div className="empty-products">
                            <p>No products available at the moment.</p>
                        </div>
                    ) : (
                        <div className="products-grid">
                            {products.map(product => (
                                <div key={product._id} className="product-card card">
                                    <img
                                        src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'}
                                        alt={product.productName}
                                        className="product-image"
                                    />
                                    <div className="product-info">
                                        <h3>{product.productName}</h3>
                                        <p className="product-category">{product.category}</p>
                                        <p className="product-price">₹{product.price}/kg</p>
                                        <p className="product-stock">
                                            {product.currentQuantity > 0 ? `${product.currentQuantity} kg available` : 'Out of Stock'}
                                        </p>
                                        <button
                                            onClick={() => handleAddToCart(product)}
                                            className="btn btn-primary btn-sm"
                                            disabled={product.currentQuantity === 0 || addingToCart[product._id]}
                                        >
                                            {addingToCart[product._id] ? 'Adding...' : '🛒 Add to Cart'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Reviews Section */}
                <section className="reviews-section">
                    <h2>Customer Reviews</h2>
                    {reviews.length === 0 ? (
                        <div className="empty-reviews">
                            <p>No reviews yet. Be the first to buy and review!</p>
                        </div>
                    ) : (
                        <div className="reviews-list">
                            {reviews.map((review, index) => (
                                <div key={index} className="review-card card">
                                    <div className="review-header">
                                        <span className="review-stars">{renderStars(review.rating)}</span>
                                        <span className="review-date">
                                            {new Date(review.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="review-comment">{review.review}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Chat Modal */}
            {showChat && (
                <ChatModal
                    recipientId={farmerId}
                    recipientType="farmer"
                    recipientName={farmer.name}
                    onClose={() => setShowChat(false)}
                />
            )}
        </div>
    );
};

export default FarmerPublicProfile;
