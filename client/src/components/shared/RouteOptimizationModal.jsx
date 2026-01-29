import { useState, useEffect } from 'react';
import { optimizeDeliverySequence, saveOptimizedSequence } from '../../services/order.service';
import { getUser } from '../../services/storage.service';
import LoadingSpinner from './LoadingSpinner';
import './RouteOptimization.css';

const RouteOptimizationModal = ({ orders, onClose, onSuccess }) => {
    const [step, setStep] = useState('select'); // select, results
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [farmerLocation, setFarmerLocation] = useState(null);
    const [locationSource, setLocationSource] = useState('profile'); // profile, device
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [error, setError] = useState('');
    const [optimizationResult, setOptimizationResult] = useState(null);

    // Get farmer's profile location on mount
    useEffect(() => {
        const user = getUser();
        if (user?.location?.coordinates?.length === 2) {
            setFarmerLocation(user.location.coordinates);
        }
    }, []);

    // Filter orders that can be optimized (processing/shipped with valid coordinates)
    const optimizableOrders = orders.filter(order =>
        ['processing', 'shipped'].includes(order.status) &&
        order.buyerDetails?.coordinates?.length === 2
    );

    const handleOrderToggle = (orderId) => {
        setSelectedOrders(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };

    const handleSelectAll = () => {
        if (selectedOrders.length === optimizableOrders.length) {
            setSelectedOrders([]);
        } else {
            setSelectedOrders(optimizableOrders.map(o => o._id));
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }

        setGettingLocation(true);
        setError('');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Note: Geolocation returns [lat, lng], but our system uses [lng, lat]
                setFarmerLocation([position.coords.longitude, position.coords.latitude]);
                setLocationSource('device');
                setGettingLocation(false);
            },
            (err) => {
                setError('Unable to get your location. Please use profile location.');
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleOptimize = async () => {
        if (selectedOrders.length < 2) {
            setError('Please select at least 2 orders to optimize');
            return;
        }

        if (!farmerLocation) {
            setError('Your location is required. Please update your profile or allow device location.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await optimizeDeliverySequence(selectedOrders, farmerLocation);
            setOptimizationResult(response.data.data);
            setStep('results');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to optimize route');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSequence = async () => {
        if (!optimizationResult?.optimizedSequence) return;

        setLoading(true);
        try {
            await saveOptimizedSequence(optimizationResult.optimizedSequence);
            onSuccess?.('Delivery sequence saved successfully!');
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save sequence');
        } finally {
            setLoading(false);
        }
    };

    const handleStartDelivery = async () => {
        // Save sequence first, then close modal
        await handleSaveSequence();
    };

    const formatAddress = (address) => {
        if (!address) return 'Address not available';
        return `${address.city || ''}, ${address.state || ''} ${address.pin || ''}`.trim();
    };

    const formatTime = (minutes) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="optimization-modal" onClick={e => e.stopPropagation()}>
                <div className="optimization-header">
                    <h2>🚚 Optimize Delivery Route</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {error && <div className="optimization-error">{error}</div>}

                {step === 'select' && (
                    <div className="optimization-content">
                        {/* Location Section */}
                        <div className="location-section">
                            <h3>📍 Your Current Location</h3>
                            <div className="location-display">
                                {farmerLocation ? (
                                    <div className="location-info">
                                        <span className="location-badge">
                                            {locationSource === 'device' ? '📱 Device GPS' : '🏠 Profile Location'}
                                        </span>
                                        <span className="coordinates">
                                            {farmerLocation[1].toFixed(4)}°N, {farmerLocation[0].toFixed(4)}°E
                                        </span>
                                    </div>
                                ) : (
                                    <span className="no-location">⚠️ No location set</span>
                                )}
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={getCurrentLocation}
                                    disabled={gettingLocation}
                                >
                                    {gettingLocation ? 'Getting...' : '📍 Use Device Location'}
                                </button>
                            </div>
                        </div>

                        {/* Order Selection Section */}
                        <div className="orders-section">
                            <div className="orders-header">
                                <h3>📦 Select Orders to Optimize</h3>
                                <button className="btn btn-link" onClick={handleSelectAll}>
                                    {selectedOrders.length === optimizableOrders.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>

                            {optimizableOrders.length === 0 ? (
                                <div className="empty-orders">
                                    <p>No orders available for optimization.</p>
                                    <small>Orders must be "processing" or "shipped" and have valid delivery coordinates.</small>
                                </div>
                            ) : (
                                <div className="orders-list-optimize">
                                    {optimizableOrders.map(order => (
                                        <div
                                            key={order._id}
                                            className={`order-card-optimize ${selectedOrders.includes(order._id) ? 'selected' : ''}`}
                                            onClick={() => handleOrderToggle(order._id)}
                                        >
                                            <div className="order-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOrders.includes(order._id)}
                                                    onChange={() => { }}
                                                />
                                            </div>
                                            <div className="order-details">
                                                <div className="order-buyer-name">{order.buyerDetails?.name}</div>
                                                <div className="order-address">{formatAddress(order.buyerDetails?.address)}</div>
                                                <div className="order-items">
                                                    {order.items?.map(i => i.name).join(', ')}
                                                </div>
                                            </div>
                                            <div className="order-meta">
                                                <span className={`badge badge-${order.status === 'shipped' ? 'primary' : 'warning'}`}>
                                                    {order.status}
                                                </span>
                                                <span className="order-total">₹{order.totalPrice}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="optimization-actions">
                            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleOptimize}
                                disabled={loading || selectedOrders.length < 2 || !farmerLocation}
                            >
                                {loading ? <LoadingSpinner size="small" /> : '🧭 Calculate Optimal Route'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'results' && optimizationResult && (
                    <div className="optimization-content">
                        {/* Summary Stats */}
                        <div className="optimization-summary">
                            <div className="summary-stat">
                                <span className="stat-value">{optimizationResult.ordersOptimized}</span>
                                <span className="stat-label">Deliveries</span>
                            </div>
                            <div className="summary-stat">
                                <span className="stat-value">{optimizationResult.totalDistance} km</span>
                                <span className="stat-label">Total Distance</span>
                            </div>
                            <div className="summary-stat">
                                <span className="stat-value">{formatTime(optimizationResult.estimatedTotalTime)}</span>
                                <span className="stat-label">Est. Time</span>
                            </div>
                        </div>

                        {/* Optimized Sequence */}
                        <div className="sequence-section">
                            <h3>🗺️ Optimized Delivery Sequence</h3>
                            <div className="sequence-list">
                                <div className="sequence-item start">
                                    <div className="sequence-number">📍</div>
                                    <div className="sequence-details">
                                        <div className="sequence-name">Your Location (Start)</div>
                                    </div>
                                </div>

                                {optimizationResult.optimizedSequence.map((order, index) => (
                                    <div key={order.orderId} className="sequence-item">
                                        <div className="sequence-connector"></div>
                                        <div className="sequence-number">{order.sequence}</div>
                                        <div className="sequence-details">
                                            <div className="sequence-name">{order.buyerName}</div>
                                            <div className="sequence-address">{formatAddress(order.address)}</div>
                                            <div className="sequence-items">
                                                {order.items?.map(i => i.name).join(', ')}
                                            </div>
                                        </div>
                                        <div className="sequence-meta">
                                            <span className="distance">{order.distanceFromPrevious} km</span>
                                            <span className="time">~{order.estimatedTimeFromPrevious} min</span>
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${order.coordinates[1]},${order.coordinates[0]}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="map-link"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                🗺️ Map
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="optimization-actions">
                            <button className="btn btn-secondary" onClick={() => setStep('select')}>
                                ← Back
                            </button>
                            <button className="btn btn-secondary" onClick={handleSaveSequence} disabled={loading}>
                                💾 Save Sequence
                            </button>
                            <button className="btn btn-primary" onClick={handleStartDelivery} disabled={loading}>
                                {loading ? <LoadingSpinner size="small" /> : '🚀 Start Delivery'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteOptimizationModal;
