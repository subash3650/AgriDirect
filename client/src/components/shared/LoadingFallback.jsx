import React from 'react';
import './LoadingSpinner.css'; // Reusing existing spinner styles

const LoadingFallback = () => {
    return (
        <div className="loading-fallback" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: '1rem'
        }}>
            <div className="spinner"></div>
            <p>Loading...</p>
        </div>
    );
};

export default LoadingFallback;
