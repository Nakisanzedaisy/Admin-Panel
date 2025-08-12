const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, activeUsers, superAdmins, admins, recentActivity] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })
    ]);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        superAdmins,
        admins
      },
      recentActivity
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;