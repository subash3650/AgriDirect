import { createContext, useState, useCallback } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);

    const addToCart = useCallback((product, quantity) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.productId === product._id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.productId === product._id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prevCart, { productId: product._id, product, quantity, price: product.price }];
        });
    }, []);

    const removeFromCart = useCallback((productId) => {
        setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    }, []);

    const updateQuantity = useCallback((productId, quantity) => {
        if (quantity <= 0) {
            setCart(prevCart => prevCart.filter(item => item.productId !== productId));
            return;
        }
        setCart(prevCart => prevCart.map(item =>
            item.productId === productId ? { ...item, quantity } : item
        ));
    }, []);

    const clearCart = useCallback(() => setCart([]), []);

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
