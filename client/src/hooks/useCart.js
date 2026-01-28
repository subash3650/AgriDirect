import { useContext } from 'react';
import { CartContext } from '../contexts/CartContext.jsx';

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
};
