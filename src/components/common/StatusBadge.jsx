import React from 'react';
import useAuth from '../../hooks/useAuth';

const StatusBadge = ({ status, priority }) => {
  const { t } = useAuth();

  if (priority) {
    // Backend PRIORITY enum: LOW | MEDIUM | HIGH | CRITICAL
    const PRIORITY_MAP = {
      CRITICAL: {
        style: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
        key: 'priorityCritical',
        fallback: 'Critical',
      },
      HIGH: {
        style: 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
        key: 'priorityHigh',
        fallback: 'High',
      },
      MEDIUM: {
        style: 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        key: 'priorityMedium',
        fallback: 'Medium',
      },
      LOW: {
        style: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        key: 'priorityLow',
        fallback: 'Low',
      },
    };

    const entry = PRIORITY_MAP[priority];
    const priorityStyle =
      entry?.style || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700';
    const label = entry ? t(entry.key, entry.fallback) : priority;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${priorityStyle}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
        {label}
      </span>
    );
  }

  // Covers every value in COMPLAINT_STATUS (backend config/constants.js).
  const NEUTRAL = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700';
  const BLUE = 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  const ORANGE = 'bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
  const AMBER = 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  const RED = 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
  const GREEN = 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

  const STATUS_MAP = {
    SUBMITTED: { style: BLUE, key: 'statusSubmitted', fallback: 'Submitted' },
    OPEN: { style: BLUE, key: 'statusOpen', fallback: 'Open' },
    ASSIGNED: { style: BLUE, key: 'statusAssigned', fallback: 'Assigned' },
    ACKNOWLEDGED: { style: ORANGE, key: 'statusAcknowledged', fallback: 'Acknowledged' },
    IN_PROGRESS: { style: ORANGE, key: 'statusInProgress', fallback: 'In Progress' },
    INFORMATION_REQUIRED: { style: AMBER, key: 'statusInformationRequired', fallback: 'Info Required' },
    ESCALATED: { style: RED, key: 'statusEscalated', fallback: 'Escalated' },
    RESOLVED: { style: GREEN, key: 'statusResolved', fallback: 'Resolved' },
    CLOSED: { style: NEUTRAL, key: 'statusClosed', fallback: 'Closed' },
  };

  const entry = STATUS_MAP[status];
  const badgeStyle = entry ? entry.style : NEUTRAL;
  const label = entry ? t(entry.key, entry.fallback) : status;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border shadow-xs ${badgeStyle}`}>
      <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
      {label}
    </span>
  );
};

export default StatusBadge;
