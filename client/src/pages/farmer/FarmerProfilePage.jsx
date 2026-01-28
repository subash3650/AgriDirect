import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import LocationPicker from '../../components/shared/LocationPicker';
import './Farmer.css';

const FarmerProfilePage = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phno: '',
        city: '',
        state: '',
        pin: '',
        location: { type: 'Point', coordinates: [], address: '' }
    });

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
                        location: data.farmer.location || { type: 'Point', coordinates: [], address: '' }
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

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleLocationChange = (location) => {
        setFormData(prev => ({
            ...prev,
            location: { type: 'Point', ...location }
        }));
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
                        <p style={{ color: '#666', marginBottom: '1rem' }}>Set your farm location for accurate deliveries</p>

                        {formData.location?.address && (
                            <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #22c55e' }}>
                                <strong>📍 Current Location:</strong> {formData.location.address}
                                {formData.location?.coordinates?.length === 2 && (
                                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                                        Coordinates: {formData.location.coordinates[1].toFixed(6)}, {formData.location.coordinates[0].toFixed(6)}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowLocationModal(true)}
                            className="btn btn-secondary"
                        >
                            📍 {formData.location?.address ? 'Update Location' : 'Set Location'}
                        </button>
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
                    <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <h3 style={{ color: '#dc2626' }}>🚨 Delete Account?</h3>
                            <p style={{ margin: '1rem 0', color: '#666' }}>All products, orders, and data will be permanently deleted.</p>
                            <div className="modal-actions">
                                <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary" disabled={deleting}>Cancel</button>
                                <button onClick={handleDeleteAccount} className="btn" style={{ background: '#dc2626', color: 'white' }} disabled={deleting}>
                                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showLocationModal && (
                    <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
                        <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                            <h2>📍 Update Farm Location</h2>
                            <p style={{ color: '#666', marginBottom: '1rem' }}>
                                Select your exact farm location for delivery purposes.
                            </p>
                            <LocationPicker
                                value={formData.location}
                                onChange={handleLocationChange}
                            />
                            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                                <button onClick={() => setShowLocationModal(false)} className="btn btn-secondary">Cancel</button>
                                <button onClick={() => setShowLocationModal(false)} className="btn btn-primary">Done</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FarmerProfilePage;
