const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }
    
    next();
  };
};

const requireSuperAdmin = requireRole(['SUPER_ADMIN']);
const requireAdmin = requireRole(['SUPER_ADMIN', 'ADMIN']);

module.exports = {
  requireRole,
  requireSuperAdmin,
  requireAdmin
};
