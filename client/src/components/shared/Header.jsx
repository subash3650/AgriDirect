import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import './Header.css';

const Header = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const { itemCount } = useCart();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        setDropdownOpen(false);
        logout();
    };

    return (
        <header className="header">
            <div className="container header-content">
                <Link to="/" className="logo">
                    <span className="logo-icon">🌾</span>
                    <span className="logo-text">AgriDirect</span>
                </Link>

                <nav className="nav">
                    {isAuthenticated ? (
                        <>
                            {user?.role === 'farmer' ? (
                                <>
                                    <Link to="/farmer/products" className="nav-link">My Products</Link>
                                    <Link to="/farmer/orders" className="nav-link">Orders</Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/buyer/browse" className="nav-link">Browse</Link>
                                    <Link to="/buyer/cart" className="nav-link cart-link">
                                        🛒 Cart {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
                                    </Link>
                                </>
                            )}

                            {}
                            <div className="profile-dropdown" ref={dropdownRef}>
                                <button
                                    className="profile-btn"
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                >
                                    <span className="profile-avatar">
                                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                    <span className="profile-name">{user?.name}</span>
                                    <span className="dropdown-arrow">{dropdownOpen ? '▲' : '▼'}</span>
                                </button>

                                {dropdownOpen && (
                                    <div className="dropdown-menu">
                                        {user?.role === 'buyer' ? (
                                            <>
                                                <Link
                                                    to="/buyer/profile"
                                                    className="dropdown-item"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    👤 My Profile
                                                </Link>
                                                <Link
                                                    to="/buyer/orders"
                                                    className="dropdown-item"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    📦 Order History
                                                </Link>
                                            </>
                                        ) : (
                                            <>
                                                <Link
                                                    to="/farmer/dashboard"
                                                    className="dropdown-item"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    📊 Dashboard
                                                </Link>
                                                <Link
                                                    to="/farmer/profile"
                                                    className="dropdown-item"
                                                    onClick={() => setDropdownOpen(false)}
                                                >
                                                    👤 My Profile
                                                </Link>
                                            </>
                                        )}
                                        <div className="dropdown-divider"></div>
                                        <button
                                            onClick={handleLogout}
                                            className="dropdown-item dropdown-logout"
                                        >
                                            🚪 Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <Link to="/auth/login" className="btn btn-secondary">Login</Link>
                            <Link to="/auth/signup" className="btn btn-primary">Sign Up</Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Header;
