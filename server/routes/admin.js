const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requirePermission, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get Dashboard Data
router.get('/dashboard', authenticateToken, requirePermission('VIEW_DASHBOARD'), async (req, res) => {
  try {
    // Get dashboard statistics
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { isActive: true } });
    const totalRoles = await prisma.role.count();

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          totalRoles
        },
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          roles: req.user.roles
        }
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create New Admin (Super Admin Only)
router.post('/create-admin', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { email, password, name, roleName = 'ADMIN' } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Get role
    const role = await prisma.role.findUnique({
      where: { name: roleName }
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with role in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name
        }
      });

      // Assign role
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: role.id
        }
      });

      return newUser;
    });

    // Return user data (excluding password)
    const userData = {
      id: result.id,
      email: result.email,
      name: result.name,
      isActive: result.isActive,
      createdAt: result.createdAt,
      role: roleName
    };

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { user: userData }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get All Users (Super Admin Only)
router.get('/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const usersData = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles: user.userRoles.map(ur => ur.role.name)
    }));

    res.json({
      success: true,
      data: { users: usersData }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Toggle User Status (Super Admin Only)
router.patch('/users/:userId/toggle-status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow super admin to deactivate themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify your own account status'
      });
    }

    // Toggle status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive }
    });

    res.json({
      success: true,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          isActive: updatedUser.isActive
        }
      }
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get Available Roles (Super Admin Only)
router.get('/roles', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });

    const rolesData = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map(rp => rp.permission.name)
    }));

    res.json({
      success: true,
      data: { roles: rolesData }
    });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;