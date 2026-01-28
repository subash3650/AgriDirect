import { createContext, useState, useCallback, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import * as userService from '../services/user.service';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { user, isAuthenticated } = useContext(AuthContext);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);

    
    useEffect(() => {
        if (isAuthenticated && user?.role === 'buyer') {
            setLoading(true);
            userService.getCart()
                .then(res => setCart(res.data.cart))
                .catch(err => console.error('Failed to fetch cart', err))
                .finally(() => setLoading(false));
        } else {
            setCart([]);
        }
    }, [isAuthenticated, user]);

    const addToCart = useCallback(async (product, quantity) => {
        if (!isAuthenticated) return Promise.reject(new Error('Please login to add to cart'));
        try {
            const res = await userService.addToCart(product._id, quantity);
            setCart(res.data.cart);
            return res.data;
        } catch (error) {
            console.error('Error adding to cart:', error);
            throw error; 
        }
    }, [isAuthenticated]);

    const removeFromCart = useCallback(async (productId) => {
        try {
            const res = await userService.removeFromCart(productId);
            setCart(res.data.cart);
        } catch (error) {
            console.error('Error removing from cart:', error);
        }
    }, []);

    const updateQuantity = useCallback(async (productId, quantity) => {
        if (quantity <= 0) {
            return removeFromCart(productId);
        }
        try {
            const res = await userService.updateCartItem(productId, quantity);
            setCart(res.data.cart);
        } catch (error) {
            console.error('Error updating quantity:', error);
            throw error;
        }
    }, [removeFromCart]);

    const clearCart = useCallback(async () => {
        try {
            await userService.clearCart();
            setCart([]);
        } catch (error) {
            console.error('Error clearing cart:', error);
        }
    }, []);

    const subtotal = cart.reduce((sum, item) => sum + (item.price || item.product?.price || 0) * item.quantity, 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    return (
        <CartContext.Provider value={{
            cart, loading, addToCart, removeFromCart, updateQuantity, clearCart,
            subtotal, tax, total, itemCount: cart.length
        }}>
            {children}
        </CartContext.Provider>
    );
};
