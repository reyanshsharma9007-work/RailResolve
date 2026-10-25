// source/middleware/rbac.middleware.js
// Role-based access control. Usage: router.get('/x', authenticate, requireRole('ADMIN'), handler)
// Must run after auth.middleware.js since it reads req.user.

const AppError = require('../utils/AppError');

function requireRole(...allowedRoles) {
  return function roleGuard(req, _res, next) {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(`This action requires one of the following roles: ${allowedRoles.join(', ')}`)
      );
    }
    next();
  };
}

module.exports = requireRole;
