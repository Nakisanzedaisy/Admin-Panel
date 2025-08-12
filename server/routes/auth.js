const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { login, logout, me } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, me);

module.exports = router;