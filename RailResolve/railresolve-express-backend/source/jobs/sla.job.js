// source/jobs/sla.job.js
// Background scheduler (PRD section 7.2). Periodically scans open
// complaints whose sla.dueAt has passed and are not yet RESOLVED/CLOSED,
// flags them ESCALATED + sla.overdue=true, writes an audit event, and
// notifies the Senior Authority queue. Runs independently of any HTTP
// request via node-cron.

const cron = require('node-cron');
const Complaint = require('../models/complaint.model');
const ComplaintStatusHistory = require('../models/complaintStatusHistory.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');
const { recordAuditEvent } = require('../services/audit.service');
const { notifyManyUsers } = require('../services/notification.service');
const {
  COMPLAINT_STATUS,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  NOTIFICATION_TYPES,
  ROLES,
} = require('../config/constants');

const SYSTEM_ACTOR_LABEL = 'SLA_SCHEDULER';

async function runSlaSweep() {
  const now = new Date();

  const overdueComplaints = await Complaint.find({
    'sla.dueAt': { $lt: now },
    'sla.overdue': false,
    status: { $nin: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED, COMPLAINT_STATUS.ESCALATED] },
  });

  if (overdueComplaints.length === 0) {
    return { scanned: 0, escalated: 0 };
  }

  const seniorAuthorities = await User.find({ role: ROLES.SENIOR_AUTHORITY, isActive: true }).select('_id');
  const seniorAuthorityIds = seniorAuthorities.map((u) => u._id);

  for (const complaint of overdueComplaints) {
    const fromStatus = complaint.status;
    complaint.status = COMPLAINT_STATUS.ESCALATED;
    complaint.sla.overdue = true;
    await complaint.save();

    await ComplaintStatusHistory.create({
      complaintId: complaint._id,
      fromStatus,
      toStatus: COMPLAINT_STATUS.ESCALATED,
      changedBy: complaint.assignedOfficerId || complaint.passengerId,
      note: `Auto-escalated by SLA scheduler: due date ${complaint.sla.dueAt.toISOString()} exceeded`,
    });

    await recordAuditEvent({
      actorUserId: complaint.assignedOfficerId || complaint.passengerId,
      action: AUDIT_ACTIONS.COMPLAINT_ESCALATED,
      entityType: AUDIT_ENTITY_TYPES.COMPLAINT,
      entityId: complaint._id,
      oldValue: { status: fromStatus, overdue: false },
      newValue: { status: COMPLAINT_STATUS.ESCALATED, overdue: true, triggeredBy: SYSTEM_ACTOR_LABEL },
    });

    await notifyManyUsers(seniorAuthorityIds, {
      type: NOTIFICATION_TYPES.COMPLAINT_ESCALATED,
      title: `SLA breached: ${complaint.referenceNumber}`,
      message: `Complaint ${complaint.referenceNumber} breached its SLA and has been auto-escalated.`,
      complaintId: complaint._id,
    });
  }

  logger.info(`SLA sweep: scanned and escalated ${overdueComplaints.length} overdue complaint(s)`);
  return { scanned: overdueComplaints.length, escalated: overdueComplaints.length };
}

/**
 * Registers the cron schedule. Called once from server.js on startup.
 * Runs every minute — fine-grained enough for the demo SLA windows
 * (as low as 15 minutes for CRITICAL priority).
 */
function startSlaScheduler() {
  cron.schedule('* * * * *', async () => {
    try {
      await runSlaSweep();
    } catch (err) {
      logger.error(`SLA sweep failed: ${err.message}`, { stack: err.stack });
    }
  });
  logger.info('SLA escalation scheduler started (runs every minute)');
}

module.exports = { startSlaScheduler, runSlaSweep };
