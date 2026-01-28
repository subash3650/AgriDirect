import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container footer-content">
                <div className="footer-brand">
                    <span className="logo-icon">🌾</span>
                    <span>AgriDirect</span>
                </div>
                <p className="footer-text">
                    Connecting farmers directly with consumers for fresher produce and fair prices.
                </p>
                <p className="footer-copyright">
                    © {new Date().getFullYear()} AgriDirect. All rights reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
