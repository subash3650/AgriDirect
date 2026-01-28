import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFarmerDashboard } from '../../services/user.service';
import { useSocket } from '../../hooks/useSocket';
import LoadingSpinner from '../../components/shared/LoadingSpinner.jsx';
import './Farmer.css';

const FarmerDashboard = () => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const { notifications } = useSocket();

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await getFarmerDashboard();
                setDashboard(response.data.dashboard);
            } catch (error) {
                console.error('Error fetching dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) return <LoadingSpinner text="Loading dashboard..." />;

    const { stats, recentOrders, recentFeedback, rating } = dashboard || {};

    return (
        <div className="dashboard-page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Farmer Dashboard</h1>
                    <p className="page-subtitle">Welcome back! Here's your farm overview.</p>
                </div>

                {notifications.length > 0 && (
                    <div className="notifications-banner">
                        🔔 You have {notifications.length} new notification(s)
                    </div>
                )}

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">📦</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats?.totalProducts || 0}</div>
                            <div className="stat-label">Products</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📋</div>
                        <div className="stat-content">
                            <div className="stat-value">{stats?.pendingOrders || 0}</div>
                            <div className="stat-label">Pending Orders</div>
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
                        <div className="stat-icon">💰</div>
                        <div className="stat-content">
                            <div className="stat-value">₹{stats?.totalRevenue?.toLocaleString() || 0}</div>
                            <div className="stat-label">Revenue</div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-grid">
                    <div className="dashboard-section">
                        <div className="section-header">
                            <h2>Recent Orders</h2>
                            <Link to="/farmer/orders" className="btn btn-secondary">View All</Link>
                        </div>
                        <div className="orders-list">
                            {recentOrders?.length > 0 ? recentOrders.map(order => (
                                <div key={order._id} className="order-item">
                                    <div className="order-product">{order.productDetails?.name}</div>
                                    <div className="order-buyer">{order.buyerDetails?.name}</div>
                                    <span className={`badge badge-${order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'warning' : 'primary'}`}>
                                        {order.status}
                                    </span>
                                    <div className="order-price">₹{order.totalPrice}</div>
                                </div>
                            )) : <p className="empty-text">No recent orders</p>}
                        </div>
                    </div>

                    <div className="dashboard-section">
                        <div className="section-header">
                            <h2>Recent Feedback</h2>
                            <div className="rating-display">⭐ {rating || 'N/A'}</div>
                        </div>
                        <div className="feedback-list">
                            {recentFeedback?.length > 0 ? recentFeedback.map(fb => (
                                <div key={fb._id} className="feedback-item">
                                    <div className="feedback-rating">{'⭐'.repeat(fb.rating)}</div>
                                    <p className="feedback-review">{fb.review}</p>
                                    <div className="feedback-meta">{fb.buyerName} • {fb.productName}</div>
                                </div>
                            )) : <p className="empty-text">No feedback yet</p>}
                        </div>
                    </div>
                </div>

                <div className="quick-actions">
                    <Link to="/farmer/products" className="btn btn-primary">Manage Products</Link>
                    <Link to="/farmer/orders" className="btn btn-secondary">View Orders</Link>
                </div>
            </div>
        </div>
    );
};

export default FarmerDashboard;
