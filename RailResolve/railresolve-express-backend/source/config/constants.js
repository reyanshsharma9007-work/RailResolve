// source/config/constants.js
// Single source of truth for every fixed enum used across the domain.
// Controllers, models, and validators all import from here so a value
// only ever needs to be added or changed in one place.

const ROLES = Object.freeze({
  PASSENGER: 'PASSENGER',
  OFFICER: 'OFFICER',
  SENIOR_AUTHORITY: 'SENIOR_AUTHORITY',
  ADMIN: 'ADMIN',
});

const ROLE_VALUES = Object.values(ROLES);

const DEPARTMENT_CODES = Object.freeze({
  TICKET_TTE: 'TICKET_TTE',
  STATION_MAINTENANCE: 'STATION_MAINTENANCE',
  TRAIN_MAINTENANCE: 'TRAIN_MAINTENANCE',
  FOOD_WATER: 'FOOD_WATER',
  TRAIN_OPERATIONS: 'TRAIN_OPERATIONS',
  BOOKING_REFUND: 'BOOKING_REFUND',
  GENERAL_SUPPORT: 'GENERAL_SUPPORT',
});

const DEPARTMENT_CODE_VALUES = Object.values(DEPARTMENT_CODES);

// Permitted categories per department. Used for validation on complaint
// creation so a category can't be submitted under the wrong department.
const DEPARTMENT_CATEGORIES = Object.freeze({
  [DEPARTMENT_CODES.TICKET_TTE]: [
    'Reserved seat issue',
    'Ticket verification',
    'Berth dispute',
    'TTE conduct',
    'Other',
  ],
  [DEPARTMENT_CODES.STATION_MAINTENANCE]: [
    'Platform cleanliness',
    'Escalator/Lift failure',
    'Waiting hall',
    'Lighting',
    'Restroom hygiene',
  ],
  [DEPARTMENT_CODES.TRAIN_MAINTENANCE]: [
    'AC malfunction',
    'Fan/Light failure',
    'Electrical charging point',
    'Door lock',
    'Coach cleanliness',
  ],
  [DEPARTMENT_CODES.FOOD_WATER]: [
    'Food quality',
    'Overcharging',
    'Water shortage',
    'Catering service hygiene',
    'Pantry staff behaviour',
  ],
  [DEPARTMENT_CODES.TRAIN_OPERATIONS]: [
    'Unscheduled delay',
    'Unannounced halt',
    'Route info gap',
    'Operational safety concern',
  ],
  [DEPARTMENT_CODES.BOOKING_REFUND]: [
    'Online booking failure',
    'Ticket cancellation delay',
    'Refund discrepancy',
    'Payment failure',
  ],
  [DEPARTMENT_CODES.GENERAL_SUPPORT]: [
    'General inquiry',
    'Porter dispute',
    'Lost & Found',
    'Miscellaneous assistance',
  ],
});

const COMPLAINT_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  ASSIGNED: 'ASSIGNED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  IN_PROGRESS: 'IN_PROGRESS',
  INFORMATION_REQUIRED: 'INFORMATION_REQUIRED',
  ESCALATED: 'ESCALATED',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
});

const COMPLAINT_STATUS_VALUES = Object.values(COMPLAINT_STATUS);

// Strict state machine: key = current status, value = set of statuses it
// may legally transition to. Enforced server-side in complaint.service.js
// so an invalid jump (e.g. SUBMITTED -> RESOLVED) is always rejected.
const STATUS_TRANSITIONS = Object.freeze({
  [COMPLAINT_STATUS.SUBMITTED]: [COMPLAINT_STATUS.ASSIGNED],
  [COMPLAINT_STATUS.ASSIGNED]: [COMPLAINT_STATUS.ACKNOWLEDGED],
  [COMPLAINT_STATUS.ACKNOWLEDGED]: [COMPLAINT_STATUS.IN_PROGRESS],
  [COMPLAINT_STATUS.IN_PROGRESS]: [
    COMPLAINT_STATUS.INFORMATION_REQUIRED,
    COMPLAINT_STATUS.ESCALATED,
    COMPLAINT_STATUS.RESOLVED,
  ],
  [COMPLAINT_STATUS.INFORMATION_REQUIRED]: [COMPLAINT_STATUS.IN_PROGRESS],
  [COMPLAINT_STATUS.ESCALATED]: [COMPLAINT_STATUS.IN_PROGRESS],
  [COMPLAINT_STATUS.RESOLVED]: [COMPLAINT_STATUS.CLOSED],
  [COMPLAINT_STATUS.CLOSED]: [],
});

const PRIORITY = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

const PRIORITY_VALUES = Object.values(PRIORITY);

// SLA target in minutes per priority (demo/workshop values, not a real
// railway service commitment).
const SLA_TARGET_MINUTES = Object.freeze({
  [PRIORITY.LOW]: 4 * 60,
  [PRIORITY.MEDIUM]: 60,
  [PRIORITY.HIGH]: 30,
  [PRIORITY.CRITICAL]: 15,
});

const AUDIT_ACTIONS = Object.freeze({
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  COMPLAINT_CREATED: 'COMPLAINT_CREATED',
  COMPLAINT_ASSIGNED: 'COMPLAINT_ASSIGNED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  ATTACHMENT_UPLOADED: 'ATTACHMENT_UPLOADED',
  COMPLAINT_ESCALATED: 'COMPLAINT_ESCALATED',
  COMPLAINT_RESOLVED: 'COMPLAINT_RESOLVED',
  COMPLAINT_CLOSED: 'COMPLAINT_CLOSED',
  DEPARTMENT_CREATED: 'DEPARTMENT_CREATED',
  DEPARTMENT_UPDATED: 'DEPARTMENT_UPDATED',
  SLA_RULE_UPDATED: 'SLA_RULE_UPDATED',
});

const AUDIT_ENTITY_TYPES = Object.freeze({
  USER: 'USER',
  COMPLAINT: 'COMPLAINT',
  DEPARTMENT: 'DEPARTMENT',
  SLA: 'SLA',
});

const NOTIFICATION_TYPES = Object.freeze({
  COMPLAINT_ASSIGNED: 'COMPLAINT_ASSIGNED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  INFORMATION_REQUESTED: 'INFORMATION_REQUESTED',
  COMPLAINT_ESCALATED: 'COMPLAINT_ESCALATED',
  COMPLAINT_RESOLVED: 'COMPLAINT_RESOLVED',
  COMPLAINT_CLOSED: 'COMPLAINT_CLOSED',
  COMMENT_ADDED: 'COMMENT_ADDED',
});

const ALLOWED_IMAGE_MIME_TYPES = Object.freeze(['image/jpeg', 'image/png']);
const ALLOWED_DOCUMENT_MIME_TYPES = Object.freeze(['application/pdf']);
const ALLOWED_UPLOAD_MIME_TYPES = Object.freeze([
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_DOCUMENT_MIME_TYPES,
]);

module.exports = {
  ROLES,
  ROLE_VALUES,
  DEPARTMENT_CODES,
  DEPARTMENT_CODE_VALUES,
  DEPARTMENT_CATEGORIES,
  COMPLAINT_STATUS,
  COMPLAINT_STATUS_VALUES,
  STATUS_TRANSITIONS,
  PRIORITY,
  PRIORITY_VALUES,
  SLA_TARGET_MINUTES,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  NOTIFICATION_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALLOWED_UPLOAD_MIME_TYPES,
};
