import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import './Header.css';

const Header = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const { itemCount } = useCart();
    const navigate = useNavigate();

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
                                    <Link to="/farmer/dashboard" className="nav-link">Dashboard</Link>
                                    <Link to="/farmer/products" className="nav-link">My Products</Link>
                                    <Link to="/farmer/orders" className="nav-link">Orders</Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/buyer/dashboard" className="nav-link">Dashboard</Link>
                                    <Link to="/buyer/browse" className="nav-link">Browse</Link>
                                    <Link to="/buyer/cart" className="nav-link cart-link">
                                        🛒 Cart {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
                                    </Link>
                                    <Link to="/buyer/orders" className="nav-link">Orders</Link>
                                </>
                            )}
                            <div className="user-menu">
                                <span className="user-name">{user?.name}</span>
                                <span className="user-role badge badge-primary">{user?.role}</span>
                                <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
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
