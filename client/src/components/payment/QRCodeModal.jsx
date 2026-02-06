import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './Payment.css';

const QRCodeModal = ({ orderDetails, onClose, onSuccess }) => {
    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [paymentSubmitted, setPaymentSubmitted] = useState(false);
    const [uploadingProof, setUploadingProof] = useState(false);
    const [screenshot, setScreenshot] = useState(null);
    const [transactionId, setTransactionId] = useState('');
    const [notes, setNotes] = useState('');
    const pollIntervalRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        generateQR();
        return () => {
            // Cleanup on unmount
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    // Timer countdown - using useCallback to prevent recreation
    useEffect(() => {
        if (!qrData || timeLeft <= 0) return;

        const timer = setTimeout(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setError('QR Code expired. Please try again.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [qrData, timeLeft]);

    // Status polling - stabilized with useCallback
    const checkPaymentStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/payments/status/${orderDetails.orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success && (data.status === 'paid' || data.status === 'awaiting_confirmation')) {
                if (data.status === 'awaiting_confirmation') {
                    setPaymentSubmitted(true);
                    clearInterval(pollIntervalRef.current);
                } else if (data.status === 'paid') {
                    onSuccess(data);
                }
            }
        } catch (err) {
            // Check silently
        }
    }, [orderDetails.orderId, onSuccess]);

    useEffect(() => {
        if (!qrData || error) return;

        pollIntervalRef.current = setInterval(checkPaymentStatus, 3000);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [qrData, error, checkPaymentStatus]);

    const generateQR = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/payments/create-qr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ orderId: orderDetails.orderId })
            });
            const data = await res.json();

            if (data.success) {
                setQrData(data);
                setLoading(false);
            } else {
                setError(data.message || 'Failed to generate QR');
                setLoading(false);
            }
        } catch (err) {
            setError('Network error. Please try again.');
            setLoading(false);
        }
    };



    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return createPortal(
        <div className="modal-overlay">
            <div className="modal qr-modal">
                <button className="close-btn" onClick={onClose}>&times;</button>
                <h3>Scan to Pay</h3>

                <div className="qr-content">
                    {loading ? (
                        <div className="loader"></div>
                    ) : error ? (
                        <div className="error-message">
                            <p>{error}</p>
                            <button onClick={generateQR} className="btn btn-sm btn-secondary">Retry</button>
                        </div>
                    ) : (
                        <>
                            <div className="qr-image-container">
                                <img src={qrData.imageUrl} alt="Payment QR Code" className="qr-code-img" />
                            </div>
                            <div className="qr-details">
                                <p className="amount">₹{qrData.amount}</p>
                                <p className="timer">Expires in: <span>{formatTime(timeLeft)}</span></p>
                                <p className="instruction">Scan with any UPI app (GPay, PhonePe, Paytm)</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default QRCodeModal;
