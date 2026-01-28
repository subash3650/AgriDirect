import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { createOrder } from '../../services/order.service';
import Toast, { useToast } from '../../components/shared/Toast.jsx';
import './Buyer.css';

const CartPage = () => {
    const { cart, removeFromCart, updateQuantity, clearCart, subtotal, tax, total, itemCount } = useCart();
    const [loading, setLoading] = useState(false);
    const [otpModal, setOtpModal] = useState({ show: false, orderId: null, otp: '' });
    const { toasts, success, error } = useToast();
    const navigate = useNavigate();

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        try {
            // Create orders for each cart item
            for (const item of cart) {
                await createOrder({
                    productId: item.productId,
                    quantity: item.quantity
                });
            }
            success('Orders placed! Check your email for OTP to verify.');
            clearCart();
            navigate('/buyer/orders');
        } catch (err) {
            error(err.response?.data?.message || 'Checkout failed');
        } finally {
            setLoading(false);
        }
    };

    if (itemCount === 0) {
        return (
            <div className="cart-page">
                <div className="container">
                    <div className="empty-cart">
                        <div className="empty-cart-icon">🛒</div>
                        <h2>Your cart is empty</h2>
                        <p>Looks like you haven't added anything yet</p>
                        <Link to="/buyer/browse" className="btn btn-primary">Start Shopping</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <Toast toasts={toasts} />
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Shopping Cart</h1>
                    <p className="page-subtitle">{itemCount} item(s) in your cart</p>
                </div>

                <div className="cart-layout">
                    <div className="cart-items">
                        {cart.map(item => (
                            <div key={item.productId} className="cart-item card">
                                <img src={item.product?.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}
                                    alt={item.product?.productName} className="cart-item-img" />
                                <div className="cart-item-info">
                                    <h3>{item.product?.productName}</h3>
                                    <p className="cart-item-farmer">by {item.product?.ownerName}</p>
                                    <p className="cart-item-price">₹{item.price}/kg</p>
                                </div>
                                <div className="cart-item-controls">
                                    <div className="quantity-selector">
                                        <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="qty-btn">-</button>
                                        <span className="qty-value">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="qty-btn">+</button>
                                    </div>
                                    <div className="cart-item-total">₹{item.price * item.quantity}</div>
                                    <button onClick={() => removeFromCart(item.productId)} className="remove-btn">🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="cart-summary card">
                        <h3>Order Summary</h3>
                        <div className="summary-row">
                            <span>Subtotal ({itemCount} items)</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                            <span>Tax (5%)</span>
                            <span>₹{tax.toFixed(2)}</span>
                        </div>
                        <div className="summary-row total">
                            <span>Total</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                        <button onClick={handleCheckout} className="btn btn-primary btn-full btn-lg" disabled={loading}>
                            {loading ? 'Processing...' : 'Proceed to Checkout'}
                        </button>
                        <p className="checkout-note">OTP will be sent to your email for verification</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;
