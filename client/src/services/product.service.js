import api from './api';

export const getAllProducts = (filters = {}) => api.get('/products', { params: filters });
export const getProduct = (id) => api.get(`/products/${id}`);
export const getMyProducts = () => api.get('/products/my-products');
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
