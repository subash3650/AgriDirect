import { useState } from 'react';
import './Payment.css';

const RazorpayCheckout = ({ orderDetails, onSuccess, onError, user }) => {
    const [loading, setLoading] = useState(false);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async () => {
        setLoading(true);

        const res = await loadRazorpayScript();
        if (!res) {
            alert('Razorpay SDK failed to load. Are you online?');
            setLoading(false);
            return;
        }

        const options = {
            key: orderDetails.key,
            amount: orderDetails.amount * 100, // Amount to paise
            currency: 'INR',
            name: 'AgriDirect',
            description: `Payment for Order #${orderDetails.razorpayOrderId}`,
            image: '/logo.png', // Add logo URL if available
            order_id: orderDetails.razorpayOrderId,
            handler: async function (response) {
                try {
                    // Send verification to backend
                    const verifyRes = await fetch('/api/payments/verify', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyData.success) {
                        onSuccess(verifyData);
                    } else {
                        onError(verifyData.message || 'Payment verification failed');
                    }
                } catch (error) {
                    onError('Payment verification error');
                }
            },
            prefill: {
                name: user?.name,
                email: user?.email,
                contact: user?.phno
            },
            notes: {
                address: 'AgriDirect Corporate Office'
            },
            theme: {
                color: '#10b981' // Primary green color
            }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function (response) {
            onError(response.error.description);
        });

        paymentObject.open();
        setLoading(false);
    };

    return (
        <button
            onClick={handlePayment}
            className="razorpay-btn"
            disabled={loading}
        >
            {loading ? 'Processing...' : `Pay ₹${orderDetails.amount} Now`}
        </button>
    );
};

export default RazorpayCheckout;
