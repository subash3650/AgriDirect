const nodemailer = require('nodemailer');


const createTransporter = () => {
    const email = process.env.SMTP_EMAIL;
    const password = process.env.SMTP_APP_PASSWORD;

    if (!email || !password) {
        console.error('[EMAIL SERVICE] Missing email credentials in .env');
        return null;
    }

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: email,
            pass: password
        }
    });
};

let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = createTransporter();
    }
    return transporter;
};

const sendOTP = async (buyerEmail, otp, orderDetails) => {
    const transport = getTransporter();

    if (!transport) {
        console.error('[EMAIL SERVICE] Transporter not available');
        return false;
    }

    const mailOptions = {
        from: `"AgriDirect" <${process.env.SMTP_EMAIL}>`,
        to: buyerEmail,
        subject: 'AgriDirect - Your Order OTP',
        text: `Your OTP for order verification is: ${otp}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #2d8a4e; text-align: center;">🌾 AgriDirect</h2>
                <h3 style="text-align: center;">Order Verification</h3>
                <p>Hello,</p>
                <p>Your order has been placed successfully!</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Product:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${orderDetails?.productName || 'N/A'}</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Quantity:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${orderDetails?.quantity || 'N/A'} kg</td></tr>
                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">₹${orderDetails?.totalPrice || 'N/A'}</td></tr>
                </table>
                <p>Please use the following OTP to verify your order:</p>
                <div style="background: #2d8a4e; color: white; font-size: 28px; font-weight: bold; text-align: center; padding: 15px; border-radius: 8px; letter-spacing: 6px; margin: 20px 0;">
                    ${otp}
                </div>
                <p style="color: #666; font-size: 12px;">This OTP is valid for 30 minutes. Do not share it with anyone.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #666; font-size: 12px; text-align: center;">Thank you for choosing AgriDirect!</p>
            </div>
        `
    };

    try {
        await transport.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('[EMAIL SERVICE] Failed to send email:', error.message);
        return false;
    }
};

const sendOrderConfirmation = async (email, order) => {
    const transport = getTransporter();
    if (!transport) return false;

    const mailOptions = {
        from: `"AgriDirect" <${process.env.SMTP_EMAIL}>`,
        to: email,
        subject: 'AgriDirect - Order Confirmed!',
        html: `<h2>Order Confirmed!</h2><p>Your order for ${order.productDetails?.name} has been confirmed. The farmer will process it shortly.</p>`
    };

    try {
        await transport.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('[EMAIL SERVICE] Order confirmation failed:', error.message);
        return false;
    }
};

const sendStatusUpdate = async (email, order, status) => {
    const transport = getTransporter();
    if (!transport) return false;

    const mailOptions = {
        from: `"AgriDirect" <${process.env.SMTP_EMAIL}>`,
        to: email,
        subject: `AgriDirect - Order ${status}`,
        html: `<h2>Order Update</h2><p>Your order status: <strong>${status}</strong></p>`
    };

    try {
        await transport.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('[EMAIL SERVICE] Status update failed:', error.message);
        return false;
    }
};


const verifyEmailConfig = async () => {
    const transport = getTransporter();

    if (!transport) {
        console.error('[EMAIL SERVICE] Cannot verify - transporter not created');
        return false;
    }

    try {
        await transport.verify();
        return true;
    } catch (error) {
        console.error('[EMAIL SERVICE] Email configuration failed:', error.message);
        return false;
    }
};

module.exports = { sendOTP, sendOrderConfirmation, sendStatusUpdate, verifyEmailConfig };
