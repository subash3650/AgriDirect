import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ProductProvider } from './contexts/ProductContext.jsx';
import { CartProvider } from './contexts/CartContext.jsx';
import { SocketProvider } from './contexts/SocketContext.jsx';
import Header from './components/shared/Header.jsx';
import Footer from './components/shared/Footer.jsx';
import ProtectedRoute from './components/shared/ProtectedRoute.jsx';

import LoginPage from './pages/auth/LoginPage.jsx';
import SignupPage from './pages/auth/SignupPage.jsx';

import FarmerDashboard from './pages/farmer/FarmerDashboard.jsx';
import ProductManagement from './pages/farmer/ProductManagement.jsx';
import OrdersManagement from './pages/farmer/OrdersManagement.jsx';
import FarmerProfilePage from './pages/farmer/FarmerProfilePage.jsx';
import FarmerMessages from './pages/farmer/FarmerMessages.jsx';

import BuyerDashboard from './pages/buyer/BuyerDashboard.jsx';
import BrowseProducts from './pages/buyer/BrowseProducts.jsx';
import ProductDetail from './pages/buyer/ProductDetail.jsx';
import CartPage from './pages/buyer/CartPage.jsx';
import OrderHistory from './pages/buyer/OrderHistory.jsx';
import FeedbackForm from './pages/buyer/FeedbackForm.jsx';
import ProfilePage from './pages/buyer/ProfilePage.jsx';
import BuyerMessages from './pages/buyer/BuyerMessages.jsx';

import FarmerPublicProfile from './pages/public/FarmerPublicProfile.jsx';

const HomePage = () => (
    <div className="home-page">
        <div className="hero">
            <div className="container">
                <h1>Farm Fresh, Direct to You</h1>
                <p>Connect directly with local farmers for the freshest produce at fair prices</p>
                <div className="hero-buttons">
                    <a href="/auth/signup" className="btn btn-primary btn-lg">Get Started</a>
                    <a href="/buyer/browse" className="btn btn-secondary btn-lg">Browse Products</a>
                </div>
            </div>
        </div>
        <style>{`
      .home-page { min-height: 70vh; }
      .hero {
        background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
        color: white;
        padding: 6rem 0;
        text-align: center;
      }
      .hero h1 { font-size: 3rem; margin-bottom: 1rem; }
      .hero p { font-size: 1.25rem; opacity: 0.9; margin-bottom: 2rem; }
      .hero-buttons { display: flex; gap: 1rem; justify-content: center; }
      .hero .btn-secondary { background: rgba(255,255,255,0.2); border: 2px solid white; color: white; }
    `}</style>
    </div>
);

const UnauthorizedPage = () => (
    <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <h1>🚫 Unauthorized</h1>
        <p>You don't have permission to access this page.</p>
        <a href="/" className="btn btn-primary">Go Home</a>
    </div>
);

function App() {
    return (
        <AuthProvider>
            <ProductProvider>
                <CartProvider>
                    <SocketProvider>
                        <div className="app-container">
                            <Header />
                            <main className="main-content">
                                <Routes>
                                    <Route path="/" element={<HomePage />} />
                                    <Route path="/auth/login" element={<LoginPage />} />
                                    <Route path="/auth/signup" element={<SignupPage />} />
                                    <Route path="/unauthorized" element={<UnauthorizedPage />} />

                                    <Route path="/farmer/dashboard" element={
                                        <ProtectedRoute requiredRole="farmer"><FarmerDashboard /></ProtectedRoute>
                                    } />
                                    <Route path="/farmer/products" element={
                                        <ProtectedRoute requiredRole="farmer"><ProductManagement /></ProtectedRoute>
                                    } />
                                    <Route path="/farmer/orders" element={
                                        <ProtectedRoute requiredRole="farmer"><OrdersManagement /></ProtectedRoute>
                                    } />
                                    <Route path="/farmer/profile" element={
                                        <ProtectedRoute requiredRole="farmer"><FarmerProfilePage /></ProtectedRoute>
                                    } />
                                    <Route path="/farmer/messages" element={
                                        <ProtectedRoute requiredRole="farmer"><FarmerMessages /></ProtectedRoute>
                                    } />

                                    <Route path="/buyer/dashboard" element={
                                        <ProtectedRoute requiredRole="buyer"><BuyerDashboard /></ProtectedRoute>
                                    } />
                                    <Route path="/buyer/browse" element={
                                        <ProtectedRoute requiredRole="buyer"><BrowseProducts /></ProtectedRoute>
                                    } />
                                    <Route path="/buyer/product/:id" element={
                                        <ProtectedRoute requiredRole="buyer"><ProductDetail /></ProtectedRoute>
                                    } />
                                    <Route path="/buyer/cart" element={
                                        <ProtectedRoute requiredRole="buyer"><CartPage /></ProtectedRoute>
                                    } />
                                    <Route path="/buyer/orders" element={
                                        <ProtectedRoute requiredRole="buyer"><OrderHistory /></ProtectedRoute>
                                    } />
                                    <Route path="/buyer/feedback/:orderId" element={
                                        <ProtectedRoute requiredRole="buyer"><FeedbackForm /></ProtectedRoute>
                                    } />
                                    <Route path="/buyer/profile" element={
                                        <ProtectedRoute requiredRole="buyer"><ProfilePage /></ProtectedRoute>
                                    } />
                                    <Route path="/buyer/messages" element={
                                        <ProtectedRoute requiredRole="buyer"><BuyerMessages /></ProtectedRoute>
                                    } />

                                    {/* Public Routes (no auth required) */}
                                    <Route path="/farmer/:farmerId" element={<FarmerPublicProfile />} />

                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </main>
                            <Footer />
                        </div>
                    </SocketProvider>
                </CartProvider>
            </ProductProvider>
        </AuthProvider>
    );
}

export default App;
