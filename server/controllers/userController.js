const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { createUserSchema, updateUserSchema } = require('../utils/validators');

const prisma = new PrismaClient();

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(role && { role }),
      ...(status && { status })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          creator: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        skip: parseInt(offset),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createUser = async (req, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, firstName, lastName, role } = value;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role,
        createdBy: req.user.id
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_USER',
        targetType: 'USER',
        targetId: user.id,
        details: { userEmail: user.email, userRole: user.role },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updateUserSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: value,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_USER',
        targetType: 'USER',
        targetId: user.id,
        details: { changes: value },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (sessions will be cascade deleted)
    await prisma.user.delete({
      where: { id }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_USER',
        targetType: 'USER',
        targetId: id,
        details: { deletedUserEmail: existingUser.email },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
};
