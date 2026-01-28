import api from './api';

export const createOrder = (data) => api.post('/orders', data);
export const verifyOTP = (orderId, otp) => api.post(`/orders/${orderId}/verify-otp`, { otp });
export const getMyOrders = () => api.get('/orders/my-orders');
export const getOrderHistory = () => api.get('/orders/history');
export const getOrder = (id) => api.get(`/orders/${id}`);
export const updateOrderStatus = (orderId, status) => api.patch(`/orders/${orderId}/status`, { status });
