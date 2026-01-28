import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Auth.css';

const SignupPage = () => {
    const { signup, error } = useAuth();
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', confirmPassword: '',
        phno: '', role: 'buyer', state: '', city: '', pin: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 6) newErrors.password = 'Min 6 characters';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.phno) newErrors.phno = 'Phone is required';
        if (!formData.state) newErrors.state = 'State is required';
        if (!formData.city) newErrors.city = 'City is required';
        if (!formData.pin) newErrors.pin = 'PIN is required';
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setLoading(true);
        const { confirmPassword, ...signupData } = formData;
        signupData.phno = Number(signupData.phno);
        signupData.pin = Number(signupData.pin);
        await signup(signupData);
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-container auth-container-wide">
                <div className="auth-header">
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Join AgriDirect as a farmer or buyer</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <input type="text" id="name" name="name" value={formData.name}
                                onChange={handleChange} className={`form-input ${errors.name ? 'error' : ''}`}
                                placeholder="John Doe" disabled={loading} />
                            {errors.name && <span className="error-text">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input type="email" id="email" name="email" value={formData.email}
                                onChange={handleChange} className={`form-input ${errors.email ? 'error' : ''}`}
                                placeholder="your@email.com" disabled={loading} />
                            {errors.email && <span className="error-text">{errors.email}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input type="password" id="password" name="password" value={formData.password}
                                onChange={handleChange} className={`form-input ${errors.password ? 'error' : ''}`}
                                placeholder="••••••••" disabled={loading} />
                            {errors.password && <span className="error-text">{errors.password}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword}
                                onChange={handleChange} className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                                placeholder="••••••••" disabled={loading} />
                            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="phno">Phone Number</label>
                            <input type="tel" id="phno" name="phno" value={formData.phno}
                                onChange={handleChange} className={`form-input ${errors.phno ? 'error' : ''}`}
                                placeholder="9876543210" disabled={loading} />
                            {errors.phno && <span className="error-text">{errors.phno}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="role">I am a</label>
                            <select id="role" name="role" value={formData.role}
                                onChange={handleChange} className="form-input" disabled={loading}>
                                <option value="buyer">Buyer</option>
                                <option value="farmer">Farmer</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row form-row-3">
                        <div className="form-group">
                            <label htmlFor="state">State</label>
                            <input type="text" id="state" name="state" value={formData.state}
                                onChange={handleChange} className={`form-input ${errors.state ? 'error' : ''}`}
                                placeholder="Karnataka" disabled={loading} />
                            {errors.state && <span className="error-text">{errors.state}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="city">City</label>
                            <input type="text" id="city" name="city" value={formData.city}
                                onChange={handleChange} className={`form-input ${errors.city ? 'error' : ''}`}
                                placeholder="Bangalore" disabled={loading} />
                            {errors.city && <span className="error-text">{errors.city}</span>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="pin">PIN Code</label>
                            <input type="text" id="pin" name="pin" value={formData.pin}
                                onChange={handleChange} className={`form-input ${errors.pin ? 'error' : ''}`}
                                placeholder="560001" disabled={loading} />
                            {errors.pin && <span className="error-text">{errors.pin}</span>}
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                        {loading ? <span className="spinner spinner-small"></span> : 'Create Account'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/auth/login">Sign in here</Link>
                </p>
            </div>
        </div>
    );
};

export default SignupPage;
