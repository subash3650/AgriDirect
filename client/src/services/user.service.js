import api from './api';

// Farmer
export const getFarmerDashboard = () => api.get('/farmers/dashboard');
export const getFarmerProfile = () => api.get('/farmers/profile');
export const updateFarmerProfile = (data) => api.put('/farmers/profile', data);
export const getFarmerFeedback = () => api.get('/farmers/feedback');

// Buyer
export const getBuyerDashboard = () => api.get('/buyers/dashboard');
export const getBuyerProfile = () => api.get('/buyers/profile');
export const updateBuyerProfile = (data) => api.put('/buyers/profile', data);

// Cart
export const getCart = () => api.get('/buyers/cart');
export const addToCart = (productId, quantity) => api.post('/buyers/cart', { productId, quantity });
export const updateCartItem = (productId, quantity) => api.put(`/buyers/cart/${productId}`, { quantity });
export const removeFromCart = (productId) => api.delete(`/buyers/cart/${productId}`);
export const clearCart = () => api.delete('/buyers/cart');

// Feedback
export const createFeedback = (data) => api.post('/feedback', data);
export const getProductFeedback = (productId) => api.get(`/feedback/product/${productId}`);
export const getMyReviews = () => api.get('/feedback/my-reviews');
