import { useState, useEffect } from 'react';
import './Payment.css';

const PaymentOptions = ({ selectedMethod, onSelect, farmerAcceptsCash }) => {
    return (
        <div className="payment-options">
            <h3>Select Payment Method</h3>

            <div className="payment-grid">
                {/* Online Payment Option */}
                <div
                    className={`payment-card ${selectedMethod === 'online' ? 'selected' : ''}`}
                    onClick={() => onSelect('online')}
                >
                    <div className="radio-circle">
                        {selectedMethod === 'online' && <div className="inner-circle"></div>}
                    </div>
                    <div className="payment-info">
                        <strong>Online Payment</strong>
                        <p>UPI, Cards, Netbanking via Razorpay</p>
                        <div className="payment-icons">
                            <span>💳</span> <span>🏦</span> <span>📱</span>
                        </div>
                    </div>
                </div>

                {/* Cash Payment Option */}
                {farmerAcceptsCash ? (
                    <div
                        className={`payment-card ${selectedMethod === 'cash' ? 'selected' : ''}`}
                        onClick={() => onSelect('cash')}
                    >
                        <div className="radio-circle">
                            {selectedMethod === 'cash' && <div className="inner-circle"></div>}
                        </div>
                        <div className="payment-info">
                            <strong>Cash on Delivery</strong>
                            <p>Pay cash directly to the farmer upon delivery.</p>
                            <div className="payment-icons">
                                <span>💵</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="payment-card disabled">
                        <div className="radio-circle disabled"></div>
                        <div className="payment-info">
                            <strong>Cash on Delivery</strong>
                            <p>This farmer does not accept cash payments.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentOptions;
