import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBuyerDashboard } from '../../services/user.service';
import LoadingSpinner from '../../components/shared/LoadingSpinner.jsx';
import './Buyer.css';

const BuyerDashboard = () => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await getBuyerDashboard();
                setDashboard(response.data.dashboard);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) return <LoadingSpinner text="Loading dashboard..." />;

    const { stats, recentOrders, recommendedProducts } = dashboard || {};

    return (
        <div className="buyer-dashboard">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Welcome Back!</h1>
                    <p className="page-subtitle">Discover fresh produce directly from farmers</p>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">📦</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats?.activeOrders || 0}</div>
                            <div className="stat-label">Active Orders</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats?.completedOrders || 0}</div>
                            <div className="stat-label">Completed</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">💳</div>
                        <div className="stat-content">
                            <div className="stat-value">₹{stats?.totalSpent?.toLocaleString() || 0}</div>
                            <div className="stat-label">Total Spent</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🛒</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats?.cartItems || 0}</div>
                            <div className="stat-label">Cart Items</div>
                        </div>
                    </div>
                </div>

                <section className="dashboard-section">
                    <div className="section-header">
                        <h2>Recent Orders</h2>
                        <Link to="/buyer/orders" className="btn btn-secondary">View All</Link>
                    </div>
                    <div className="orders-list">
                        {recentOrders?.length > 0 ? recentOrders.map(order => (
                            <div key={order._id} className="order-item-card">
                                <img src={order.productDetails?.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=60'}
                                    alt="" className="order-item-img" />
                                <div className="order-item-info">
                                    <h4>{order.productDetails?.name}</h4>
                                    <p>From {order.farmerDetails?.name}</p>
                                </div>
                                <span className={`badge badge-${order.status === 'delivered' ? 'success' :
                                    order.status === 'pending' ? 'warning' : 'primary'}`}>
                                    {order.status}
                                </span>
                                <div className="order-item-price">₹{order.totalPrice}</div>
                            </div>
                        )) : <p className="empty-text">No orders yet. Start shopping!</p>}
                    </div>
                </section>

                <section className="dashboard-section">
                    <div className="section-header">
                        <h2>Recommended for You</h2>
                        <Link to="/buyer/browse" className="btn btn-primary">Browse All</Link>
                    </div>
                    <div className="products-carousel grid grid-3">
                        {recommendedProducts?.slice(0, 6).map(product => (
                            <Link key={product._id} to={`/buyer/product/${product._id}`} className="product-card-small card">
                                <img src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'}
                                    alt={product.productName} className="product-card-img" />
                                <div className="product-card-content">
                                    <span className="badge badge-primary">{product.category}</span>
                                    <h4>{product.productName}</h4>
                                    <div className="product-card-meta">
                                        <span className="price">₹{product.price}/kg</span>
                                        <span className="rating">⭐ {product.rating || 'New'}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default BuyerDashboard;
