const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const kycController = require('../controllers/kyc.controller');

const router = express.Router();

// All routes require authentication as farmer
router.use(protect);
router.use(authorize('farmer'));

// KYC routes
router.post('/submit', kycController.submitKYC);
router.get('/status', kycController.getKYCStatus);
router.patch('/cash-preference', kycController.updateCashPreference);
router.get('/wallet', kycController.getWalletBalance);

module.exports = router;
