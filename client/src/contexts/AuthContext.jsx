import { createContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/auth.service';
import { setToken, setUser, getToken, getUser, clearAuth } from '../services/storage.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUserState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = getUser();
        const storedToken = getToken();
        if (storedToken && storedUser) {
            setUserState(storedUser);
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email, password) => {
        try {
            setError(null);
            const response = await authService.login(email, password);
            const { token, user: userData } = response.data;
            setToken(token);
            setUser(userData);
            setUserState(userData);
            navigate(userData.role === 'farmer' ? '/farmer/dashboard' : '/buyer/browse');
            return { success: true };
        } catch (err) {
            const message = err.response?.data?.message || 'Login failed';
            setError(message);
            return { success: false, error: message };
        }
    }, [navigate]);

    const signup = useCallback(async (formData) => {
        try {
            setError(null);
            const response = await authService.register(formData);
            const { token, user: userData } = response.data;
            setToken(token);
            setUser(userData);
            setUserState(userData);
            navigate(userData.role === 'farmer' ? '/farmer/dashboard' : '/buyer/browse');
            return { success: true };
        } catch (err) {
            const message = err.response?.data?.message || 'Signup failed';
            setError(message);
            return { success: false, error: message };
        }
    }, [navigate]);

    const logout = useCallback(() => {
        setUserState(null);
        clearAuth();
        navigate('/auth/login');
    }, [navigate]);

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, loading, error, isAuthenticated, login, signup, logout, setError }}>
            {children}
        </AuthContext.Provider>
    );
};
