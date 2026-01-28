import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProduct } from '../../services/product.service';
import { getProductFeedback } from '../../services/user.service';
import { useCart } from '../../hooks/useCart';
import LoadingSpinner from '../../components/shared/LoadingSpinner.jsx';
import Toast, { useToast } from '../../components/shared/Toast.jsx';
import './Buyer.css';

const ProductDetail = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [feedback, setFeedback] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();
    const { toasts, success, error } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productRes, feedbackRes] = await Promise.all([
                    getProduct(id),
                    getProductFeedback(id)
                ]);
                setProduct(productRes.data.product);
                setFeedback(feedbackRes.data.feedback || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleAddToCart = async () => {
        try {
            await addToCart(product, quantity);
            success(`Added ${quantity} kg to cart!`);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to add to cart';
            error(msg);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!product) return <div className="empty-state"><h3>Product not found</h3></div>;

    return (
        <div className="product-detail-page">
            <Toast toasts={toasts} />
            <div className="container">
                <Link to="/buyer/browse" className="back-link">← Back to Products</Link>

                <div className="product-detail">
                    <div className="product-detail-image">
                        <img src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600'}
                            alt={product.productName} />
                    </div>

                    <div className="product-detail-info">
                        <span className="badge badge-primary">{product.category}</span>
                        <h1>{product.productName}</h1>
                        <div className="product-rating">⭐ {product.rating || 'New'} ({product.totalReviews || 0} reviews)</div>
                        <p className="product-description">{product.description}</p>

                        <div className="farmer-info">
                            <strong>Sold by:</strong> {product.owner?.name || product.ownerName}
                            <br /><span>📍 {product.city}, {product.state}</span>
                            <Link to={`/farmer/${product.owner?._id || product.owner}`} className="btn btn-secondary btn-sm view-farmer-btn">
                                👤 View Farmer Profile
                            </Link>
                        </div>

                        <div className="product-price-large">₹{product.price}<span>/kg</span></div>
                        <div className="stock-info">
                            {product.currentQuantity > 0 ? (
                                <span className="in-stock">✓ In Stock ({product.currentQuantity} kg available)</span>
                            ) : (
                                <span className="out-of-stock">✗ Out of Stock</span>
                            )}
                        </div>

                        <div className="add-to-cart-section">
                            <div className="quantity-selector">
                                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="qty-btn">-</button>
                                <input type="number"
                                    value={quantity}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);

                                        if (!isNaN(val)) {
                                            setQuantity(Math.min(Math.max(1, val), product.currentQuantity));
                                        }
                                    }}
                                    min="1" max={product.currentQuantity} className="qty-input" />
                                <button onClick={() => setQuantity(q => Math.min(product.currentQuantity, q + 1))} className="qty-btn">+</button>
                            </div>
                            <button onClick={handleAddToCart} className="btn btn-primary btn-lg"
                                disabled={product.currentQuantity === 0}>
                                Add to Cart - ₹{product.price * quantity}
                            </button>
                        </div>
                    </div>
                </div>

                <section className="reviews-section">
                    <h2>Customer Reviews ({feedback.length})</h2>
                    {feedback.length > 0 ? (
                        <div className="reviews-list">
                            {feedback.map(review => (
                                <div key={review._id} className="review-card">
                                    <div className="review-header">
                                        <span className="review-author">{review.buyerName}</span>
                                        <span className="review-rating">{'⭐'.repeat(review.rating)}</span>
                                    </div>
                                    <p className="review-text">{review.review}</p>
                                    <span className="review-date">{new Date(review.createdAt).toLocaleDateString()}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-text">No reviews yet. Be the first to review!</p>
                    )}
                </section>
            </div>
        </div>
    );
};

export default ProductDetail;
