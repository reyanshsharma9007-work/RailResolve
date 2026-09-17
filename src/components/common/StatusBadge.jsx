import React from 'react';
import useAuth from '../../hooks/useAuth';

const StatusBadge = ({ status, priority }) => {
  const { t } = useAuth();

  if (priority) {
    let priorityStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700';
    let label = priority === 'HIGH' ? t('priorityHigh') : priority === 'MEDIUM' ? t('priorityMedium') : t('priorityLow');

    if (priority === 'HIGH') {
      priorityStyle = 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
    } else if (priority === 'MEDIUM') {
      priorityStyle = 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    } else if (priority === 'LOW') {
      priorityStyle = 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${priorityStyle}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
        {label}
      </span>
    );
  }

  let badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700';
  let label = status;

  if (status === 'IN_PROGRESS') {
    badgeStyle = 'bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    label = t('statusInProgress');
  } else if (status === 'RESOLVED') {
    badgeStyle = 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    label = t('statusResolved');
  } else if (status === 'OPEN') {
    badgeStyle = 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    label = t('statusOpen');
  } else if (status === 'ESCALATED') {
    badgeStyle = 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
    label = t('statusEscalated');
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border shadow-xs ${badgeStyle}`}>
      <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
      {label}
    </span>
  );
};

export default StatusBadge;
