const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { getDashboard, getProfile, updateProfile, getFeedback, deleteAccount } = require('../controllers/farmer.controller');
const router = express.Router();

router.use(protect, authorize('farmer'));
router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/feedback', getFeedback);
router.delete('/account', deleteAccount);

module.exports = router;
