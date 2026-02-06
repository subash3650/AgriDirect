
const Razorpay = require('razorpay');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../../server/.env');

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
    });
}

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function run() {
    console.log("Testing Payment Link + QRCode Gen...");
    try {
        // 1. Create Link
        const pl = await razorpay.paymentLink.create({
            amount: 100,
            currency: "INR",
            accept_partial: false,
            description: "Test QR Link",
            customer: {
                name: "Test User",
                email: "test@example.com",
                contact: "+919876543210" // VALID DUMMY NUMBER
            },
            notify: { sms: false, email: false }
        });
        console.log("Payment Link Created:", pl.short_url);

        // 2. Convert to QR
        const qrDataUrl = await QRCode.toDataURL(pl.short_url);
        console.log("QR Data URL Generated:", qrDataUrl.substring(0, 50) + "...");

        console.log("SUCCESS! Logic works.");

    } catch (e) {
        console.error("FAILED:", e);
    }
}

run();
