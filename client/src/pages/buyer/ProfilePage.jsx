import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './Buyer.css';

const ProfilePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phno: '',
        city: '',
        state: '',
        pin: '',
        location: {
            coordinates: [],
            address: ''
        }
    });
    const [mapLoaded, setMapLoaded] = useState(false);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const leafletRef = useRef(null);

    
    useEffect(() => {
        if (window.L) {
            leafletRef.current = window.L;
            setMapLoaded(true);
            return;
        }

        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => {
            leafletRef.current = window.L;
            setMapLoaded(true);
        };
        document.head.appendChild(script);
    }, []);

    
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/buyers/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    setProfile(data.buyer);
                    setFormData({
                        name: data.buyer.name || '',
                        email: data.buyer.email || '',
                        phno: data.buyer.phno || '',
                        city: data.buyer.city || '',
                        state: data.buyer.state || '',
                        pin: data.buyer.pin || '',
                        location: data.buyer.location || { coordinates: [], address: '' }
                    });
                }
            } catch (error) {
                setMessage({ type: 'error', text: 'Failed to load profile' });
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || !leafletRef.current) return;

        const L = leafletRef.current;

        const initialCenter = formData.location?.coordinates?.length === 2
            ? [formData.location.coordinates[1], formData.location.coordinates[0]]
            : [20.5937, 78.9629]; 

        mapInstanceRef.current = L.map(mapRef.current).setView(initialCenter, formData.location?.coordinates?.length === 2 ? 15 : 5);

        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(mapInstanceRef.current);

        
        if (formData.location?.coordinates?.length === 2) {
            markerRef.current = L.marker(initialCenter, { draggable: true })
                .addTo(mapInstanceRef.current)
                .bindPopup('Your location')
                .openPopup();

            markerRef.current.on('dragend', (e) => {
                const { lat, lng } = e.target.getLatLng();
                updateLocation(lat, lng);
            });
        }

        
        mapInstanceRef.current.on('click', (e) => {
            const { lat, lng } = e.latlng;
            placeMarker(lat, lng);
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [mapLoaded]);

    const placeMarker = (lat, lng) => {
        const L = leafletRef.current;
        if (!L || !mapInstanceRef.current) return;

        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        } else {
            markerRef.current = L.marker([lat, lng], { draggable: true })
                .addTo(mapInstanceRef.current)
                .bindPopup('Selected location')
                .openPopup();

            markerRef.current.on('dragend', (e) => {
                const { lat, lng } = e.target.getLatLng();
                updateLocation(lat, lng);
            });
        }

        mapInstanceRef.current.setView([lat, lng], 15);
        updateLocation(lat, lng);
    };

    const updateLocation = async (lat, lng) => {
        
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

            setFormData(prev => ({
                ...prev,
                location: { coordinates: [lng, lat], address }
            }));
        } catch {
            setFormData(prev => ({
                ...prev,
                location: { coordinates: [lng, lat], address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }
            }));
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setMessage({ type: 'error', text: 'Geolocation not supported' });
            return;
        }

        setMessage({ type: 'info', text: 'Getting your location...' });
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                placeMarker(latitude, longitude);
                setMessage({ type: 'success', text: 'Location updated!' });
            },
            () => {
                setMessage({ type: 'error', text: 'Failed to get location. Please select on map.' });
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const searchLocation = async (address) => {
        if (!address.trim()) return;

        setMessage({ type: 'info', text: 'Searching...' });
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                placeMarker(parseFloat(lat), parseFloat(lon));
                setFormData(prev => ({
                    ...prev,
                    location: { coordinates: [parseFloat(lon), parseFloat(lat)], address: display_name }
                }));
                setMessage({ type: 'success', text: 'Location found!' });
            } else {
                setMessage({ type: 'error', text: 'Location not found' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Error searching location' });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/buyers/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setProfile(data.buyer);
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to update profile' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/buyers/account', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                logout();
                navigate('/');
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to delete account' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete account' });
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (loading) {
        return (
            <div className="profile-page">
                <div className="container">
                    <div className="loading-spinner">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <div className="container">
                <div className="profile-header">
                    <h1>My Profile</h1>
                    <p>Manage your account information and delivery location</p>
                </div>

                {message.text && (
                    <div className={`alert alert-${message.type}`}>{message.text}</div>
                )}

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-section">
                        <h3>Personal Information</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="name">Full Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phno">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phno"
                                    name="phno"
                                    value={formData.phno}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Address</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="city">City</label>
                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="state">State</label>
                                <input
                                    type="text"
                                    id="state"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="pin">PIN Code</label>
                                <input
                                    type="text"
                                    id="pin"
                                    name="pin"
                                    value={formData.pin}
                                    onChange={handleChange}
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Delivery Location</h3>
                        <p className="section-description">
                            Select your exact delivery location on the map. This helps farmers deliver products accurately.
                        </p>

                        <div className="location-controls">
                            <button
                                type="button"
                                onClick={getCurrentLocation}
                                className="btn btn-secondary location-btn"
                            >
                                📍 Use Current Location
                            </button>

                            <div className="search-box">
                                <input
                                    type="text"
                                    placeholder="Search for address..."
                                    className="form-input"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            searchLocation(e.target.value);
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        const input = e.target.previousElementSibling;
                                        if (input) searchLocation(input.value);
                                    }}
                                    className="btn btn-primary"
                                >
                                    Search
                                </button>
                            </div>
                        </div>

                        <div ref={mapRef} className="map-container"></div>

                        {formData.location?.address && (
                            <div className="location-display">
                                <strong>📍 Selected Location:</strong>
                                <p>{formData.location.address}</p>
                                {formData.location.coordinates?.length === 2 && (
                                    <small>
                                        Coordinates: {formData.location.coordinates[1].toFixed(6)}, {formData.location.coordinates[0].toFixed(6)}
                                    </small>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </form>

                {}
                <div className="danger-zone">
                    <h3>⚠️ Danger Zone</h3>
                    <p>Once you delete your account, all your data including orders and reviews will be permanently removed.</p>
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="btn btn-danger"
                    >
                        Delete My Account
                    </button>
                </div>

                {}
                {showDeleteConfirm && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>🚨 Delete Account?</h3>
                            <p>This action cannot be undone. All your data will be permanently deleted.</p>
                            <div className="modal-actions">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="btn btn-secondary"
                                    disabled={deleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="btn btn-danger"
                                    disabled={deleting}
                                >
                                    {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .profile-page {
                    padding: 2rem 0;
                    min-height: 70vh;
                }
                .profile-header {
                    margin-bottom: 2rem;
                }
                .profile-header h1 {
                    font-size: 2rem;
                    color: var(--color-text);
                    margin-bottom: 0.5rem;
                }
                .profile-header p {
                    color: var(--color-text-muted);
                }
                .profile-form {
                    max-width: 800px;
                    background: var(--color-surface);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }
                .form-section {
                    margin-bottom: 2rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid var(--color-border);
                }
                .form-section:last-of-type {
                    border-bottom: none;
                }
                .form-section h3 {
                    font-size: 1.125rem;
                    color: var(--color-text);
                    margin-bottom: 1rem;
                }
                .section-description {
                    color: var(--color-text-muted);
                    font-size: 0.875rem;
                    margin-bottom: 1rem;
                }
                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                }
                .location-controls {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1rem;
                    flex-wrap: wrap;
                }
                .location-btn {
                    white-space: nowrap;
                }
                .search-box {
                    display: flex;
                    gap: 0.5rem;
                    flex: 1;
                    min-width: 250px;
                }
                .search-box input {
                    flex: 1;
                }
                .map-container {
                    width: 100%;
                    height: 350px;
                    border-radius: var(--radius-md);
                    border: 2px solid var(--color-border);
                    margin-bottom: 1rem;
                    z-index: 1;
                }
                .location-display {
                    background: var(--color-bg);
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    border-left: 4px solid var(--color-primary);
                }
                .location-display strong {
                    color: var(--color-primary);
                }
                .location-display p {
                    margin: 0.5rem 0;
                }
                .location-display small {
                    color: var(--color-text-muted);
                }
                .form-actions {
                    margin-top: 2rem;
                    text-align: right;
                }
                .alert-info {
                    background: #e0f2fe;
                    border-color: #0284c7;
                    color: #0369a1;
                }
                .danger-zone {
                    max-width: 800px;
                    margin-top: 2rem;
                    padding: 1.5rem;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: var(--radius-lg);
                }
                .danger-zone h3 {
                    color: #dc2626;
                    margin-bottom: 0.5rem;
                }
                .danger-zone p {
                    color: #7f1d1d;
                    margin-bottom: 1rem;
                    font-size: 0.875rem;
                }
                .btn-danger {
                    background: #dc2626;
                    color: white;
                    border: none;
                }
                .btn-danger:hover {
                    background: #b91c1c;
                }
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .modal-content {
                    background: white;
                    padding: 2rem;
                    border-radius: var(--radius-lg);
                    max-width: 400px;
                    text-align: center;
                }
                .modal-content h3 {
                    margin-bottom: 1rem;
                    color: #dc2626;
                }
                .modal-content p {
                    margin-bottom: 1.5rem;
                    color: var(--color-text-muted);
                }
                .modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }
            `}</style>
        </div>
    );
};

export default ProfilePage;
