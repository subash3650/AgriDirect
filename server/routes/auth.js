const express = require('express');
const { protect } = require('../middleware/auth');
const { register, login, getMe, logout } = require('../controllers/auth.controller');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
