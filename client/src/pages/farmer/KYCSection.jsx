import { useState, useEffect } from 'react';

const KYCSection = ({ farmerId }) => {
    const [kycStatus, setKycStatus] = useState('pending');
    const [acceptsCash, setAcceptsCash] = useState(true);
    const [walletBalance, setWalletBalance] = useState(0);
    const [bankDetails, setBankDetails] = useState({
        accountNumber: '',
        ifscCode: '',
        accountHolderName: ''
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchKYCData();
    }, []);

    const fetchKYCData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/farmers/kyc/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setKycStatus(data.kycStatus);
                setAcceptsCash(data.acceptsCash);
                setWalletBalance(data.walletBalance);
                if (data.bankDetails) {
                    setBankDetails(data.bankDetails);
                }
            }
        } catch (error) {
            console.error('Failed to fetch KYC stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBankSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/farmers/kyc/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bankDetails)
            });
            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Bank details verified successfully!' });
                setKycStatus(data.kycStatus);
            } else {
                setMessage({ type: 'error', text: data.message || 'Verification failed' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Server error. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    const toggleCashPreference = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/farmers/kyc/cash-preference', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ acceptsCash: !acceptsCash })
            });
            const data = await response.json();
            if (data.success) {
                setAcceptsCash(data.acceptsCash);
            }
        } catch (error) {
            console.error('Failed to update cash preference:', error);
        }
    };

    if (loading) return <div className="kyc-loading">Loading KYC details...</div>;

    return (
        <div className="kyc-section">
            <div className="kyc-header">
                <h3>💰 Payments & KYC</h3>
                <div className="wallet-badge">
                    <span>Wallet Balance:</span>
                    <strong>₹{walletBalance}</strong>
                </div>
            </div>

            {/* KYC Status Banner */}
            <div className={`kyc-status-banner ${kycStatus}`}>
                {kycStatus === 'verified' ? (
                    <div className="status-content">
                        <span className="icon">✅</span>
                        <div>
                            <h4>Bank Account Verified</h4>
                            <p>You can receive online payments directly to your account.</p>
                        </div>
                    </div>
                ) : (
                    <div className="status-content">
                        <span className="icon">⚠️</span>
                        <div>
                            <h4>Action Required</h4>
                            <p>Verify your bank account to receive online payments.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="kyc-grid">
                {/* Bank Details Form */}
                <div className="kyc-card">
                    <h4>🏦 Bank Details</h4>
                    <form onSubmit={handleBankSubmit}>
                        <div className="form-group">
                            <label>Account Holder Name</label>
                            <input
                                type="text"
                                className="styled-input"
                                value={bankDetails.accountHolderName}
                                onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                                disabled={kycStatus === 'verified'}
                                placeholder="e.g. Subash"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Account Number</label>
                            <input
                                type="password"
                                className="styled-input"
                                value={bankDetails.accountNumber}
                                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                disabled={kycStatus === 'verified'}
                                placeholder="Enter account number"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm Account Number</label>
                            <input
                                type="text"
                                className={`styled-input ${bankDetails.confirmAccountNumber && bankDetails.accountNumber !== bankDetails.confirmAccountNumber ? 'error-border' : ''}`}
                                value={bankDetails.confirmAccountNumber}
                                onChange={(e) => setBankDetails({ ...bankDetails, confirmAccountNumber: e.target.value })}
                                disabled={kycStatus === 'verified'}
                                placeholder="Re-enter account number"
                                required
                            />
                            {bankDetails.confirmAccountNumber && bankDetails.accountNumber !== bankDetails.confirmAccountNumber && (
                                <span className="error-text">Account numbers do not match</span>
                            )}
                        </div>
                        <div className="form-group">
                            <label>IFSC Code</label>
                            <input
                                type="text"
                                className="styled-input"
                                value={bankDetails.ifscCode}
                                onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                                disabled={kycStatus === 'verified'}
                                placeholder="ABCD0123456"
                                maxLength="11"
                                required
                            />
                        </div>

                        {message.text && (
                            <div className={`message-alert ${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        {kycStatus !== 'verified' && (
                            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
                                {submitting ? 'Verifying...' : 'Verify Bank Details'}
                            </button>
                        )}
                    </form>
                </div>

                {/* Payment Preferences */}
                <div className="kyc-card preferences-card">
                    <h4>⚙️ Payment Preferences</h4>

                    <div className="preference-item">
                        <div className="pref-info">
                            <strong>Cash on Delivery</strong>
                            <p>Accept cash payments from buyers directly.</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={acceptsCash}
                                onChange={toggleCashPreference}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div className="preference-item disabled">
                        <div className="pref-info">
                            <strong>Online Payments</strong>
                            <p>{kycStatus === 'verified' ? 'Active via Razorpay' : 'Requires Bank Verification'}</p>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={kycStatus === 'verified'}
                                disabled
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .kyc-section {
                    margin-top: 2rem;
                    padding-top: 2rem;
                    border-top: 1px solid var(--color-border);
                }
                .kyc-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                .wallet-badge {
                    background: #f0fdf4;
                    color: #166534;
                    padding: 0.5rem 1rem;
                    border-radius: 99px;
                    display: flex;
                    gap: 0.5rem;
                    border: 1px solid #bbf7d0;
                }
                .kyc-status-banner {
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 2rem;
                }
                .kyc-status-banner.verified {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                }
                .kyc-status-banner.pending {
                    background: #fffbeb;
                    border: 1px solid #fef3c7;
                }
                .status-content {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }
                .status-content .icon {
                    font-size: 1.5rem;
                }
                .status-content h4 {
                    margin: 0;
                    margin-bottom: 0.25rem;
                }
                .status-content p {
                    margin: 0;
                    font-size: 0.9rem;
                    opacity: 0.9;
                }
                .kyc-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }
                .kyc-card {
                    background: #fff;
                    padding: 1.5rem;
                    border-radius: 12px;
                    border: 1px solid var(--color-border);
                }
                .kyc-card h4 {
                    margin-top: 0;
                    margin-bottom: 1.5rem;
                    color: var(--color-text);
                    font-size: 1.1rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid #f0f0f0;
                }
                
                /* Enhanced Form Styles */
                .form-group {
                    margin-bottom: 1.25rem;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: #374151;
                    font-size: 0.9rem;
                }
                .styled-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                    background-color: #f9fafb;
                }
                .styled-input:focus {
                    outline: none;
                    border-color: var(--color-primary);
                    background-color: #fff;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
                }
                .styled-input.error-border {
                    border-color: #ef4444;
                    background-color: #fef2f2;
                }
                .styled-input:disabled {
                    background-color: #e5e7eb;
                    cursor: not-allowed;
                    color: #6b7280;
                }
                .error-text {
                    color: #ef4444;
                    font-size: 0.8rem;
                    margin-top: 0.25rem;
                    display: block;
                }
                .btn-full {
                    width: 100%;
                    padding: 0.875rem;
                    font-weight: 600;
                    margin-top: 0.5rem;
                }
                .message-alert {
                    padding: 0.75rem;
                    border-radius: 6px;
                    margin-bottom: 1rem;
                    font-size: 0.9rem;
                }
                .message-alert.success {
                    background: #dcfce7;
                    color: #166534;
                }
                .message-alert.error {
                    background: #fee2e2;
                    color: #991b1b;
                }
                .preference-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 0;
                    border-bottom: 1px solid var(--color-border);
                }
                .preference-item:last-child {
                    border-bottom: none;
                }
                .preference-item.disabled {
                    opacity: 0.6;
                }
                .pref-info p {
                    margin: 0;
                    font-size: 0.85rem;
                    color: var(--color-text-light);
                }
                
                /* Switch Toggle */
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 24px;
                }
                .switch input { 
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .4s;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                }
                input:checked + .slider {
                    background-color: var(--color-primary);
                }
                input:checked + .slider:before {
                    transform: translateX(26px);
                }
                .slider.round {
                    border-radius: 34px;
                }
                .slider.round:before {
                    border-radius: 50%;
                }

                @media (max-width: 768px) {
                    .kyc-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default KYCSection;
