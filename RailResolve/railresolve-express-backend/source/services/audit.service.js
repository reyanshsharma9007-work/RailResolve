// source/services/audit.service.js
// Single entry point for writing to the immutable audit_logs collection.
// Every controller/service that performs a sensitive or state-changing
// action should call this instead of writing to AuditLog directly, so the
// shape of an audit entry stays consistent everywhere.

const AuditLog = require('../models/auditLog.model');
const logger = require('../utils/logger');

async function recordAuditEvent({ actorUserId, action, entityType, entityId, oldValue = null, newValue = null, ipAddress = null }) {
  try {
    await AuditLog.create({
      actorUserId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress,
    });
  } catch (err) {
    // Audit logging must never crash the primary request flow. Log loudly
    // server-side instead so the gap is visible to operators.
    logger.error(`Failed to write audit log for action ${action} on ${entityType} ${entityId}: ${err.message}`);
  }
}

module.exports = { recordAuditEvent };
