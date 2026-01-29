import { createContext, useState, useCallback, useEffect } from 'react';
import * as productService from '../services/product.service';
import { useSocket } from '../hooks/useSocket';

export const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { socket } = useSocket();
    const [filters, setFilters] = useState({
        category: '',
        minPrice: 0,
        maxPrice: 10000,
        state: '',
        search: ''
    });

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const response = await productService.getAllProducts();
            setProducts(response.data.products || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleProductAdded = (newProduct) => {
            setProducts(prev => [newProduct, ...prev]);
        };

        const handleProductUpdated = (updatedProduct) => {
            setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
        };

        const handleProductDeleted = (productId) => {
            setProducts(prev => prev.filter(p => p._id !== productId));
        };

        socket.on('product_added', handleProductAdded);
        socket.on('product_updated', handleProductUpdated);
        socket.on('product_deleted', handleProductDeleted);

        return () => {
            socket.off('product_added', handleProductAdded);
            socket.off('product_updated', handleProductUpdated);
            socket.off('product_deleted', handleProductDeleted);
        };
    }, [socket]);

    useEffect(() => {
        let result = products;
        if (filters.category) result = result.filter(p => p.category === filters.category);
        if (filters.minPrice || filters.maxPrice) {
            result = result.filter(p => p.price >= filters.minPrice && p.price <= filters.maxPrice);
        }
        if (filters.state) result = result.filter(p => p.state?.toLowerCase().includes(filters.state.toLowerCase()));
        if (filters.search) {
            result = result.filter(p => p.productName?.toLowerCase().includes(filters.search.toLowerCase()));
        }
        setFilteredProducts(result);
    }, [products, filters]);

    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    return (
        <ProductContext.Provider value={{ products, filteredProducts, loading, error, filters, fetchProducts, updateFilters }}>
            {children}
        </ProductContext.Provider>
    );
};
