import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { useCart } from '../../hooks/useCart';
import LoadingSpinner from '../../components/shared/LoadingSpinner.jsx';
import Toast, { useToast } from '../../components/shared/Toast.jsx';
import './Buyer.css';

const CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Grains', 'Dairy', 'Organic', 'Other'];

const BrowseProducts = () => {
    const { products, filteredProducts, loading, fetchProducts, updateFilters, filters } = useProducts();
    const { addToCart } = useCart();
    const { toasts, success } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        updateFilters({ search: e.target.value });
    };

    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        updateFilters({ category: category === 'All' ? '' : category });
    };

    const handleAddToCart = (product) => {
        addToCart(product, 1);
        success(`${product.productName} added to cart!`);
    };

    if (loading) return <LoadingSpinner text="Loading products..." />;

    return (
        <div className="browse-page">
            <Toast toasts={toasts} />
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Fresh from the Farm</h1>
                    <p className="page-subtitle">{filteredProducts.length} products available</p>
                </div>

                <div className="browse-filters">
                    <div className="search-box">
                        <input type="text" placeholder="Search products..." className="form-input"
                            value={searchTerm} onChange={handleSearch} />
                    </div>
                    <div className="category-tabs">
                        {CATEGORIES.map(cat => (
                            <button key={cat} onClick={() => handleCategoryChange(cat)}
                                className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredProducts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <h3>No products found</h3>
                        <p>Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="products-grid grid grid-4">
                        {filteredProducts.map(product => (
                            <div key={product._id} className="product-card card">
                                <Link to={`/buyer/product/${product._id}`}>
                                    <img src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'}
                                        alt={product.productName} className="product-image" />
                                </Link>
                                <div className="product-content">
                                    <span className="badge badge-primary">{product.category}</span>
                                    <Link to={`/buyer/product/${product._id}`}>
                                        <h3 className="product-name">{product.productName}</h3>
                                    </Link>
                                    <p className="product-farmer">by {product.ownerName || 'Farmer'}</p>
                                    <p className="product-location">📍 {product.city}, {product.state}</p>
                                    <div className="product-footer">
                                        <div className="product-price">₹{product.price}<span>/kg</span></div>
                                        <div className="product-stock">{product.currentQuantity} kg left</div>
                                    </div>
                                    <button onClick={() => handleAddToCart(product)}
                                        className="btn btn-primary btn-full" disabled={product.currentQuantity === 0}>
                                        {product.currentQuantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BrowseProducts;
