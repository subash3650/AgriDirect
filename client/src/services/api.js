import axios from 'axios';
import { getToken } from './storage.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only handle 401 if it's truly an authentication/token error
        if (error.response?.status === 401) {
            const message = (error.response?.data?.message || '').toLowerCase();

            // Only redirect if it's a true token validation failure
            const isTokenError = message.includes('token') ||
                message.includes('not authorized') ||
                message.includes('unauthorized') ||
                message.includes('no token');

            if (isTokenError) {
                console.warn('[API] Auth error, redirecting to login:', message);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/auth/login';
            } else {
                // Log but don't redirect for other 401 errors
                console.warn('[API] 401 error (not token-related):', message);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
