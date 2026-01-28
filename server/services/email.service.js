const nodemailer = require('nodemailer');

// Create transporter with detailed logging
const createTransporter = () => {
    const email = process.env.SMTP_EMAIL;
    const password = process.env.SMTP_APP_PASSWORD;

    console.log('\n[EMAIL SERVICE] Creating transporter...');
    console.log('[EMAIL SERVICE] SMTP_EMAIL:', email || 'NOT SET');
    console.log('[EMAIL SERVICE] SMTP_APP_PASSWORD:', password ? `${password.substring(0, 4)}****` : 'NOT SET');

    if (!email || !password) {
        console.error('[EMAIL SERVICE] ❌ Missing email credentials in .env');
        return null;
    }

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use TLS
        auth: {
            user: email,
            pass: password
        },
        debug: true, // Enable debug output
        logger: true  // Log to console
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
    console.log('\n' + '='.repeat(60));
    console.log('[EMAIL SERVICE] SENDING OTP EMAIL');
    console.log('='.repeat(60));
    console.log('[EMAIL SERVICE] To:', buyerEmail);
    console.log('[EMAIL SERVICE] OTP:', otp);
    console.log('[EMAIL SERVICE] Order Details:', JSON.stringify(orderDetails, null, 2));

    const transport = getTransporter();

    if (!transport) {
        console.error('[EMAIL SERVICE] ❌ Transporter not available - check .env credentials');
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

    console.log('[EMAIL SERVICE] Mail options prepared');
    console.log('[EMAIL SERVICE] From:', mailOptions.from);
    console.log('[EMAIL SERVICE] To:', mailOptions.to);
    console.log('[EMAIL SERVICE] Subject:', mailOptions.subject);

    try {
        console.log('[EMAIL SERVICE] Attempting to send email...');
        const info = await transport.sendMail(mailOptions);
        console.log('[EMAIL SERVICE] ✅ Email sent successfully!');
        console.log('[EMAIL SERVICE] Message ID:', info.messageId);
        console.log('[EMAIL SERVICE] Response:', info.response);
        console.log('='.repeat(60) + '\n');
        return true;
    } catch (error) {
        console.error('[EMAIL SERVICE] ❌ FAILED TO SEND EMAIL');
        console.error('[EMAIL SERVICE] Error Code:', error.code);
        console.error('[EMAIL SERVICE] Error Message:', error.message);
        console.error('[EMAIL SERVICE] Full Error:', error);
        console.log('='.repeat(60) + '\n');
        return false;
    }
};

const sendOrderConfirmation = async (email, order) => {
    console.log('[EMAIL SERVICE] Sending order confirmation to:', email);

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
        console.log('[EMAIL SERVICE] ✅ Order confirmation sent');
        return true;
    } catch (error) {
        console.error('[EMAIL SERVICE] ❌ Order confirmation failed:', error.message);
        return false;
    }
};

const sendStatusUpdate = async (email, order, status) => {
    console.log('[EMAIL SERVICE] Sending status update to:', email, 'Status:', status);

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
        console.log('[EMAIL SERVICE] ✅ Status update sent');
        return true;
    } catch (error) {
        console.error('[EMAIL SERVICE] ❌ Status update failed:', error.message);
        return false;
    }
};

// Verify email configuration on startup
const verifyEmailConfig = async () => {
    console.log('\n[EMAIL SERVICE] Verifying email configuration...');
    const transport = getTransporter();

    if (!transport) {
        console.error('[EMAIL SERVICE] ❌ Cannot verify - transporter not created');
        return false;
    }

    try {
        await transport.verify();
        console.log('[EMAIL SERVICE] ✅ Email configuration verified successfully!');
        return true;
    } catch (error) {
        console.error('[EMAIL SERVICE] ❌ Email configuration FAILED');
        console.error('[EMAIL SERVICE] Error:', error.message);
        console.error('[EMAIL SERVICE] Possible issues:');
        console.error('   1. Wrong email/password in .env');
        console.error('   2. App Password not created correctly');
        console.error('   3. 2-Step Verification not enabled on Gmail');
        console.error('   4. Less secure app access blocked');
        return false;
    }
};

module.exports = { sendOTP, sendOrderConfirmation, sendStatusUpdate, verifyEmailConfig };
