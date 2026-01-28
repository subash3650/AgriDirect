import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './Farmer.css';

const FarmerProfilePage = () => {
    const { logout } = useAuth();
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
        location: { coordinates: [], address: '' }
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
                const response = await fetch('/api/farmers/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    setProfile(data.farmer);
                    setFormData({
                        name: data.farmer.name || '',
                        email: data.farmer.email || '',
                        phno: data.farmer.phno || '',
                        city: data.farmer.city || '',
                        state: data.farmer.state || '',
                        pin: data.farmer.pin || '',
                        location: data.farmer.location || { coordinates: [], address: '' }
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
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(mapInstanceRef.current);

        if (formData.location?.coordinates?.length === 2) {
            markerRef.current = L.marker(initialCenter, { draggable: true })
                .addTo(mapInstanceRef.current)
                .bindPopup('Your farm location');
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
                .bindPopup('Farm location');
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
            setFormData(prev => ({
                ...prev,
                location: { coordinates: [lng, lat], address: data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}` }
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
                placeMarker(position.coords.latitude, position.coords.longitude);
                setMessage({ type: 'success', text: 'Location updated!' });
            },
            () => setMessage({ type: 'error', text: 'Failed to get location.' }),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/farmers/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Profile updated!' });
                setProfile(data.farmer);
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to update' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/farmers/account', {
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
        } catch {
            setMessage({ type: 'error', text: 'Failed to delete account' });
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div className="farmer-profile-page">
            <div className="container">
                <h1>🌾 Farm Profile</h1>
                <p>Manage your farm information and location</p>

                {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-section">
                        <h3>Farm Information</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Farm/Owner Name</label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" required />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input type="tel" name="phno" value={formData.phno} onChange={handleChange} className="form-input" required />
                            </div>
                            <div className="form-group">
                                <label>City</label>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} className="form-input" required />
                            </div>
                            <div className="form-group">
                                <label>State</label>
                                <input type="text" name="state" value={formData.state} onChange={handleChange} className="form-input" required />
                            </div>
                            <div className="form-group">
                                <label>PIN Code</label>
                                <input type="text" name="pin" value={formData.pin} onChange={handleChange} className="form-input" />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Farm Location</h3>
                        <p style={{ color: '#666', marginBottom: '1rem' }}>Click on map to set your farm location for deliveries</p>
                        <button type="button" onClick={getCurrentLocation} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
                            📍 Use Current Location
                        </button>
                        <div ref={mapRef} style={{ height: '300px', borderRadius: '8px', border: '2px solid #ddd' }}></div>
                        {formData.location?.address && (
                            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginTop: '1rem', borderLeft: '4px solid #22c55e' }}>
                                <strong>📍 Farm Location:</strong> {formData.location.address}
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ marginTop: '1rem' }}>
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px' }}>
                    <h3 style={{ color: '#dc2626' }}>⚠️ Danger Zone</h3>
                    <p style={{ color: '#7f1d1d', marginBottom: '1rem' }}>Deleting your account will remove all your products, orders and data permanently.</p>
                    <button onClick={() => setShowDeleteConfirm(true)} className="btn" style={{ background: '#dc2626', color: 'white' }}>
                        Delete My Account
                    </button>
                </div>

                {showDeleteConfirm && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '400px', textAlign: 'center' }}>
                            <h3 style={{ color: '#dc2626' }}>🚨 Delete Account?</h3>
                            <p style={{ margin: '1rem 0', color: '#666' }}>All products, orders, and data will be permanently deleted.</p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary" disabled={deleting}>Cancel</button>
                                <button onClick={handleDeleteAccount} className="btn" style={{ background: '#dc2626', color: 'white' }} disabled={deleting}>
                                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FarmerProfilePage;
