// source/models/auditLog.model.js
// Immutable audit trail. Nothing in the application ever updates or
// deletes an audit_logs document — only audit.service.js inserts new ones.
// No route exposes edit/delete for this collection (see admin.router.js).

const mongoose = require('mongoose');
const { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } = require('../config/constants');

const auditLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: Object.values(AUDIT_ACTIONS), required: true },
    entityType: { type: String, enum: Object.values(AUDIT_ENTITY_TYPES), required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
