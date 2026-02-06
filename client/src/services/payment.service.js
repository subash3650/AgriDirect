import api from './api';

export const createPaymentOrder = (data) => api.post('/payments/create-order', data);
export const verifyPayment = (data) => api.post('/payments/verify', data);
export const confirmCashPayment = (orderId) => api.post(`/payments/cash-confirm/${orderId}`);
export const getPaymentStatus = (orderId) => api.get(`/payments/status/${orderId}`);

// UPI Related
export const createUPIQRCode = (data) => api.post('/payments/create-qr', data);
export const markUPIAsPaid = (orderId, formData) => api.post(`/payments/mark-paid/${orderId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const confirmUPIPayment = (orderId) => api.post(`/payments/confirm-upi/${orderId}`);
export const rejectUPIPayment = (orderId, reason) => api.post(`/payments/reject-upi/${orderId}`, { rejectionReason: reason });
