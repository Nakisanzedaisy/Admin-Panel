const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireSuperAdmin, requireAdmin } = require('../middleware/rbac');
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

router.get('/', requireAdmin, getAllUsers);
router.post('/', requireSuperAdmin, createUser);
router.put('/:id', requireSuperAdmin, updateUser);
router.delete('/:id', requireSuperAdmin, deleteUser);

module.exports = router;