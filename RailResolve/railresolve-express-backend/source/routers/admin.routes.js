// source/routers/admin.routes.js
// Everything here requires ADMIN, except audit-log reads which the RBAC
// matrix also grants to SENIOR_AUTHORITY, and analytics which SENIOR_AUTHORITY
// also gets a full view of.

const express = require('express');
const adminController = require('../controllers/admin.controller');
const authenticate = require('../middleware/auth.middleware');
const requireRole = require('../middleware/rbac.middleware');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(authenticate);

// ----- User / staff management -----
router.get('/users', requireRole(ROLES.ADMIN), adminController.listUsers);
// Creates OFFICER / SENIOR_AUTHORITY / ADMIN accounts. The only way a
// non-passenger account comes into existence besides the seed script.
router.post('/users', requireRole(ROLES.ADMIN), adminController.createUser);
router.patch('/users/:id/role', requireRole(ROLES.ADMIN), adminController.updateUserRole);
router.patch('/users/:id/deactivate', requireRole(ROLES.ADMIN), adminController.deactivateUser);
router.patch('/users/:id/activate', requireRole(ROLES.ADMIN), adminController.activateUser);
router.patch('/users/:id/password', requireRole(ROLES.ADMIN), adminController.resetUserPassword);

// ----- Oversight -----
router.get('/audit-logs', requireRole(ROLES.ADMIN, ROLES.SENIOR_AUTHORITY), adminController.listAuditLogs);
router.get('/analytics', requireRole(ROLES.ADMIN, ROLES.SENIOR_AUTHORITY), adminController.getAnalytics);

// ----- Configuration -----
router.get('/departments', requireRole(ROLES.ADMIN), adminController.listDepartments);
router.patch('/departments/:id', requireRole(ROLES.ADMIN), adminController.updateDepartment);

router.get('/sla-rules', requireRole(ROLES.ADMIN), adminController.listSlaRules);
router.put('/sla-rules', requireRole(ROLES.ADMIN), adminController.upsertSlaRule);

module.exports = router;
