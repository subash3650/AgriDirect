import api from './api';

export const createOrder = (data) => api.post('/orders', data);
export const verifyOTP = (orderId, otp) => api.post(`/orders/${orderId}/verify-otp`, { otp });
export const getMyOrders = () => api.get('/orders/my-orders');
export const getOrderHistory = () => api.get('/orders/history');
export const getOrder = (id) => api.get(`/orders/${id}`);
export const updateOrderStatus = (orderId, status) => api.patch(`/orders/${orderId}/status`, { status });
export const cancelOrder = (orderId, reason) => api.put(`/orders/${orderId}/cancel`, { reason });

// Route Optimization APIs
export const optimizeDeliverySequence = (orderIds, farmerLocation) =>
    api.post('/optimize/delivery-sequence', { orderIds, farmerLocation });
export const saveOptimizedSequence = (sequenceData) =>
    api.post('/optimize/save-sequence', { sequenceData });
export const clearDeliverySequence = (orderIds) =>
    api.post('/optimize/clear-sequence', { orderIds });
export const getActiveSequence = () =>
    api.get('/optimize/active-sequence');

