import React, { useState, useEffect, useCallback } from 'react';
import useAuth from '../../hooks/useAuth';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';
import { complaintService } from '../../services/complaintService';
import { attachmentService } from '../../services/attachmentService';
import { ROLES, normalizeRole } from '../../constants/roles';

/**
 * Shared complaint workspace for OFFICER and SENIOR_AUTHORITY.
 *
 * Both roles consume exactly the same Express endpoints; only the queue they
 * see and the transitions they may perform differ, so the behaviour is driven
 * by props instead of duplicating the page. No endpoint is invented here —
 * everything maps to a route that already exists in complaint.routes.js.
 *
 * Server-side scoping does the real filtering: GET /api/complaints already
 * limits an OFFICER to their own department and gives SENIOR_AUTHORITY the full
 * list, so this component never has to guess at visibility.
 */

// Mirrors STATUS_TRANSITIONS in the backend's config/constants.js.
export const STATUS_TRANSITIONS = {
  SUBMITTED: ['ASSIGNED'],
  ASSIGNED: ['ACKNOWLEDGED'],
  ACKNOWLEDGED: ['IN_PROGRESS'],
  IN_PROGRESS: ['INFORMATION_REQUIRED', 'ESCALATED', 'RESOLVED'],
  INFORMATION_REQUIRED: ['IN_PROGRESS'],
  ESCALATED: ['IN_PROGRESS'],
  RESOLVED: [],
  CLOSED: [],
};

const STATUS_FILTERS = [
  'ALL',
  'ASSIGNED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'INFORMATION_REQUIRED',
  'ESCALATED',
  'RESOLVED',
  'CLOSED',
];

const StaffConsole = ({
  title,
  subtitle,
  icon = 'engineering',
  initialStatusFilter = 'ALL',
  // Priorities highlighted at the top of the queue (senior authority view).
  emphasisePriorities = null,
}) => {
  const { user, role, t } = useAuth();
  const currentRole = normalizeRole(role);

  // POST /:id/resolve allows OFFICER and SENIOR_AUTHORITY only.
  const canResolve =
    currentRole === ROLES.OFFICER || currentRole === ROLES.SENIOR_AUTHORITY;
  // POST /:id/escalate allows OFFICER, SENIOR_AUTHORITY and ADMIN.
  const canEscalate = canResolve || currentRole === ROLES.ADMIN;

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const [commentText, setCommentText] = useState('');
  const [isInfoRequest, setIsInfoRequest] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await complaintService.getAll({ limit: 100 });
      if (res.success) setComplaints(res.data.complaints || []);
    } catch (err) {
      console.error('Failed to load complaint queue', err);
      setLoadError(
        err.status === 403
          ? t('errorForbidden', 'You are not authorised to view this queue.')
          : err.message || t('errorGeneric', 'Could not load complaints. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const loadDetail = async (complaintId) => {
    try {
      setDetailLoading(true);
      const res = await complaintService.getById(complaintId);
      if (res.success) {
        setDetail(res.data);
        setSelected(res.data.complaint);
        setNewStatus(res.data.complaint.status);
      }
    } catch (err) {
      setActionError(err.message || t('errorGeneric', 'Could not load complaint details.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const openComplaint = (complaint) => {
    setSelected(complaint);
    setDetail(null);
    setNewStatus(complaint.status);
    setNote('');
    setCommentText('');
    setIsInfoRequest(false);
    setActionError(null);
    setActionSuccess(null);
    loadDetail(complaint._id);
  };

  const closeComplaint = () => {
    setSelected(null);
    setDetail(null);
    setActionError(null);
    setActionSuccess(null);
  };

  // Only transitions the backend permits from the current status, minus those
  // this role cannot perform.
  const nextStatusOptions = selected
    ? (STATUS_TRANSITIONS[selected.status] || []).filter((next) => {
        if (next === 'ASSIGNED') return false; // assignment endpoint only
        if (next === 'RESOLVED') return canResolve;
        if (next === 'ESCALATED') return canEscalate;
        return true;
      })
    : [];

  const statusChanged = Boolean(newStatus && selected && newStatus !== selected.status);
  const noteRequired = statusChanged && newStatus === 'RESOLVED';
  const noteRelevant =
    statusChanged && ['RESOLVED', 'ESCALATED', 'INFORMATION_REQUIRED'].includes(newStatus);

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selected || !statusChanged) {
      setActionError(t('nothingToUpdate', 'Nothing to update.'));
      return;
    }
    // Mirrors validateResolvePayload so the message arrives before the 400 does.
    if (noteRequired && note.trim().length < 5) {
      setActionError(
        t('resolutionNoteRequired', 'A resolution note of at least 5 characters is required.')
      );
      return;
    }

    try {
      setUpdating(true);
      setActionError(null);
      setActionSuccess(null);

      if (newStatus === 'RESOLVED') {
        await complaintService.resolve(selected._id, { resolutionNote: note.trim() });
      } else if (newStatus === 'ESCALATED') {
        await complaintService.escalate(selected._id, { note: note.trim() || undefined });
      } else {
        await complaintService.updateStatus(selected._id, {
          status: newStatus,
          note: note.trim() || undefined,
        });
      }

      // Re-read from the server; never assume the write landed.
      await loadDetail(selected._id);
      await fetchComplaints();
      setNote('');
      setActionSuccess(t('statusUpdated', 'Complaint updated.'));
    } catch (err) {
      console.error('Status update failed', err);
      // Surface the backend's own message (e.g. INVALID_STATUS_TRANSITION).
      setActionError(err.message || t('errorGeneric', 'Update failed.'));
      if (selected) await loadDetail(selected._id);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!selected || !commentText.trim()) return;
    try {
      setAddingComment(true);
      setActionError(null);
      await complaintService.addComment(selected._id, {
        message: commentText.trim(),
        isInfoRequest,
      });
      setCommentText('');
      setIsInfoRequest(false);
      await loadDetail(selected._id);
      await fetchComplaints();
    } catch (err) {
      setActionError(err.message || t('errorGeneric', 'Could not add comment.'));
    } finally {
      setAddingComment(false);
    }
  };

  const filtered = complaints.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (c.referenceNumber || '').toLowerCase().includes(q) ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.passengerId?.name || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const ordered = emphasisePriorities
    ? [...filtered].sort((a, b) => {
        const rank = (c) => (emphasisePriorities.includes(c.priority) ? 0 : 1);
        return rank(a) - rank(b);
      })
    : filtered;

  const countBy = (predicate) => complaints.filter(predicate).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-margin py-8">
      {/* Header */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-4">
          <span className="p-3 rounded-2xl bg-primary text-on-primary shadow-sm">
            <span className="material-symbols-outlined text-[24px]">{icon}</span>
          </span>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-on-surface dark:text-white tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium mt-1">
              {subtitle} &bull; {user?.name}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchComplaints}
          className="px-4 py-2.5 rounded-2xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 hover:border-primary text-on-surface dark:text-white font-extrabold text-xs active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">refresh</span>
          <span>{t('refreshBtn', 'Refresh')}</span>
        </button>
      </div>

      {/* KPI strip — derived from the fetched queue, not invented numbers. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('queueTotal', 'In my queue'), value: complaints.length, icon: 'assignment', tone: 'text-blue-600 dark:text-blue-300' },
          { label: t('queueActive', 'Active'), value: countBy((c) => ['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status)), icon: 'engineering', tone: 'text-primary' },
          { label: t('queueEscalated', 'Escalated'), value: countBy((c) => c.status === 'ESCALATED'), icon: 'priority_high', tone: 'text-error' },
          { label: t('queueResolved', 'Resolved / Closed'), value: countBy((c) => ['RESOLVED', 'CLOSED'].includes(c.status)), icon: 'task_alt', tone: 'text-emerald-600 dark:text-emerald-300' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-surface-container-lowest dark:bg-slate-900 p-5 rounded-2xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase">
                {kpi.label}
              </span>
              <span className={`material-symbols-outlined text-[20px] ${kpi.tone}`}>{kpi.icon}</span>
            </div>
            <p className="text-3xl font-black text-on-surface dark:text-white mt-2">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-2xl border border-outline-variant/60 dark:border-slate-800 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 block uppercase mb-1">
              {t('statusFilter')}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? t('allStatuses') : s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 block uppercase mb-1">
              {t('priorityFilter')}
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">{t('allPriorities')}</option>
              <option value="CRITICAL">{t('priorityCritical')}</option>
              <option value="HIGH">{t('priorityHigh')}</option>
              <option value="MEDIUM">{t('priorityMedium')}</option>
              <option value="LOW">{t('priorityLow')}</option>
            </select>
          </div>
        </div>
        <div className="w-full md:w-72">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 block uppercase mb-1">
            {t('searchMatrix')}
          </label>
          <div className="relative flex items-center bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3 py-1.5">
            <span className="material-symbols-outlined text-outline dark:text-slate-400 text-[18px] mr-1.5">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholderAdmin')}
              className="w-full bg-transparent border-none outline-none text-xs font-bold text-on-surface dark:text-white placeholder:text-outline"
            />
          </div>
        </div>
      </div>

      {/* Queue */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-lg overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-outline-variant/60 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-on-surface dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">table_chart</span>
            {t('complaintQueue', 'Complaint Queue')}
          </h3>
          <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 bg-surface-container-low dark:bg-slate-800 px-3 py-1 rounded-full">
            {t('showingRecords')} {ordered.length}
          </span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-surface-container-low dark:bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-4">{loadError}</p>
            <button
              type="button"
              onClick={fetchComplaints}
              className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-extrabold text-xs cursor-pointer"
            >
              {t('retryBtn', 'Retry')}
            </button>
          </div>
        ) : ordered.length === 0 ? (
          <div className="p-10 text-center">
            <span className="material-symbols-outlined text-4xl text-outline mb-3">inbox</span>
            <p className="text-sm font-bold text-on-surface dark:text-white">
              {t('noComplaintsInQueue', 'No complaints match the current filters.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low dark:bg-slate-800 border-b border-outline-variant dark:border-slate-700 text-on-surface dark:text-white font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="p-4">{t('refIdDateCol')}</th>
                  <th className="p-4">{t('passengerPnrCol')}</th>
                  <th className="p-4">{t('categoryIssueCol')}</th>
                  <th className="p-4">{t('priorityCol')}</th>
                  <th className="p-4">{t('statusSlaCol')}</th>
                  <th className="p-4 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 dark:divide-slate-800 font-semibold text-on-surface-variant dark:text-slate-300">
                {ordered.map((c) => (
                  <tr
                    key={c._id}
                    className="hover:bg-surface-container-low/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-4 font-bold text-on-surface dark:text-white">
                      <span className="text-primary font-mono block">{c.referenceNumber || c._id}</span>
                      <span className="text-[10px] text-on-surface-variant dark:text-slate-400 font-normal">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-on-surface dark:text-white">
                      {c.passengerId?.name || 'Passenger'}
                    </td>
                    <td className="p-4 max-w-xs">
                      <span className="text-[10px] font-bold text-primary bg-primary-fixed dark:bg-orange-950 dark:text-orange-200 px-2 py-0.5 rounded-full block w-max mb-1">
                        {c.category}
                      </span>
                      <p className="text-xs font-bold text-on-surface dark:text-white line-clamp-1">{c.title}</p>
                    </td>
                    <td className="p-4">
                      <StatusBadge priority={c.priority} />
                    </td>
                    <td className="p-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => openComplaint(c)}
                        className="px-3 py-1.5 rounded-full bg-primary text-on-primary font-bold hover:bg-primary-container transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        <span>{t('openBtn', 'Open')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complaint workspace */}
      {selected && (
        <Modal
          isOpen={Boolean(selected)}
          onClose={closeComplaint}
          title={`${t('complaintDetail', 'Complaint')} \u2022 ${selected.referenceNumber || selected._id}`}
        >
          <div className="space-y-4 text-left">
            <div className="p-4 bg-surface-container-low dark:bg-slate-800 rounded-2xl border border-outline-variant/60 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={selected.status} />
                <StatusBadge priority={selected.priority} />
                {selected.isEscalated && (
                  <span className="text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
                    {t('statusEscalated')}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-extrabold text-on-surface dark:text-white mb-1">{selected.title}</h4>
              <p className="text-xs text-on-surface-variant dark:text-slate-300 mb-2">{selected.description}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-on-surface dark:text-white">
                <span>{t('passengerLabel', 'Passenger')}: {detail?.complaint?.passengerId?.name || '—'}</span>
                <span>{t('departmentLabel', 'Department')}: {selected.departmentId?.name || '—'}</span>
                <span>{t('categoryLabel')}: {selected.category}</span>
                <span>
                  {t('assignedExecutive')}: {detail?.complaint?.assignedOfficerId?.name || t('unassignedText')}
                </span>
              </div>
            </div>

            {detailLoading && (
              <div className="p-3 rounded-2xl bg-surface-container-low dark:bg-slate-800 text-xs font-bold text-on-surface-variant dark:text-slate-300 flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[16px] text-primary">refresh</span>
                {t('loadingDetail', 'Loading complaint details...')}
              </div>
            )}

            {/* AI analysis — delivered through Express, never fetched from FastAPI. */}
            {detail?.aiAnalysis?.processingStatus === 'SUCCESS' ? (
              <div className="p-4 rounded-2xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700">
                <h5 className="text-xs font-extrabold text-on-surface dark:text-white mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
                  {t('aiAnalysis', 'AI Analysis')}
                </h5>
                {detail.aiAnalysis.summary && (
                  <p className="text-xs text-on-surface-variant dark:text-slate-300 font-medium mb-2">
                    {detail.aiAnalysis.summary}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {detail.aiAnalysis.issueType && (
                    <span className="text-[10px] font-bold text-primary bg-primary-fixed dark:bg-orange-950 dark:text-orange-200 px-2 py-0.5 rounded-full">
                      {detail.aiAnalysis.issueType}
                    </span>
                  )}
                  {(detail.aiAnalysis.keywords || []).map((kw) => (
                    <span
                      key={kw}
                      className="text-[10px] font-bold text-on-surface-variant dark:text-slate-300 bg-surface-container-lowest dark:bg-slate-700 border border-outline-variant/60 dark:border-slate-600 px-2 py-0.5 rounded-full"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ) : detail?.aiAnalysis?.processingStatus === 'FAILED' ? (
              <div className="p-3 rounded-2xl bg-surface-container-low dark:bg-slate-800 text-xs font-medium text-on-surface-variant dark:text-slate-400">
                {t('aiUnavailable', 'AI analysis unavailable. The grievance itself is unaffected.')}
              </div>
            ) : detail ? (
              <div className="p-3 rounded-2xl bg-surface-container-low dark:bg-slate-800 text-xs font-medium text-on-surface-variant dark:text-slate-400">
                {t('aiPending', 'AI analysis is still processing.')}
              </div>
            ) : null}

            {/* Evidence */}
            {detail && (
              <div className="p-4 rounded-2xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700">
                <h5 className="text-xs font-extrabold text-on-surface dark:text-white mb-2">
                  {t('attachmentsPhotos')} ({detail.attachments?.length || 0})
                </h5>
                <div className="flex flex-wrap gap-2">
                  {(detail.attachments || []).map((a) => (
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => attachmentService.openInNewTab(a._id)}
                      className="text-[11px] text-primary font-bold flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest dark:bg-slate-700 border border-outline-variant/60 dark:border-slate-600 hover:border-primary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">attachment</span>
                      <span className="truncate max-w-[10rem]">{a.originalFilename}</span>
                    </button>
                  ))}
                  {(detail.attachments || []).length === 0 && (
                    <span className="text-xs text-on-surface-variant dark:text-slate-400 font-medium">
                      {t('noEvidence', 'No evidence attached.')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            {detail && (detail.statusHistory || []).length > 0 && (
              <div className="p-4 rounded-2xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700">
                <h5 className="text-xs font-extrabold text-on-surface dark:text-white mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">timeline</span>
                  {t('timelineLabel', 'Timeline')}
                </h5>
                <ol className="space-y-1.5">
                  {detail.statusHistory.map((h) => (
                    <li key={h._id} className="text-[11px] text-on-surface-variant dark:text-slate-300 font-medium">
                      <span className="font-bold text-on-surface dark:text-white">
                        {h.fromStatus || '—'} &rarr; {h.toStatus}
                      </span>{' '}
                      &bull; {new Date(h.createdAt).toLocaleString()}
                      {h.note ? ` — ${h.note}` : ''}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Status actions */}
            <form onSubmit={handleStatusSubmit} className="space-y-3">
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block">
                {t('updateStatusLabel')}
              </label>
              {nextStatusOptions.length === 0 ? (
                <p className="text-xs font-medium text-on-surface-variant dark:text-slate-400 bg-surface-container-low dark:bg-slate-800 rounded-xl px-3.5 py-2.5">
                  {selected.status === 'SUBMITTED'
                    ? t('awaitingAssignmentHint', 'This complaint must be assigned before work can begin.')
                    : t('noTransitionAvailable', 'No further status change is available from this state.')}
                </p>
              ) : (
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value={selected.status}>{selected.status} ({t('currentWord', 'current')})</option>
                  {nextStatusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}

              {noteRelevant && (
                <div>
                  <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">
                    {newStatus === 'RESOLVED'
                      ? t('resolutionNoteLabel', 'Resolution note (required, min 5 characters)')
                      : t('noteOptionalLabel', 'Note (optional)')}
                  </label>
                  <textarea
                    rows="3"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              {actionError && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-xl text-xs font-bold">
                  {actionError}
                </div>
              )}
              {actionSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 p-3 rounded-xl text-xs font-bold">
                  {actionSuccess}
                </div>
              )}

              {nextStatusOptions.length > 0 && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updating || !statusChanged}
                    className="px-6 py-2.5 text-xs font-extrabold text-on-primary bg-primary hover:bg-primary-container disabled:opacity-50 rounded-full shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {updating ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">save</span>
                    )}
                    <span>{updating ? t('savingWord', 'Saving...') : t('saveTelemetryBtn')}</span>
                  </button>
                </div>
              )}
            </form>

            {/* Comments — separate from the status form so commenting never
                triggers a transition. */}
            <div className="pt-4 border-t border-outline-variant/60 dark:border-slate-700">
              <h5 className="text-xs font-extrabold text-on-surface dark:text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">forum</span>
                {t('commentsLabel', 'Comments')} ({detail?.comments?.length || 0})
              </h5>
              <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                {(detail?.comments || []).map((cm) => (
                  <div
                    key={cm._id}
                    className={`p-2.5 rounded-xl border ${
                      cm.isInfoRequest
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                        : 'bg-surface-container-low dark:bg-slate-800 border-outline-variant/60 dark:border-slate-700'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-primary block">
                      {cm.authorId?.name || 'User'}
                    </span>
                    <p className="text-xs text-on-surface dark:text-white font-medium">{cm.message}</p>
                  </div>
                ))}
                {detail && (detail.comments || []).length === 0 && (
                  <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium">
                    {t('noMessages')}
                  </p>
                )}
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t('typeMessagePlaceholder')}
                  className="flex-1 bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={addingComment || !commentText.trim()}
                  className="px-4 py-2 text-xs font-extrabold text-on-primary bg-primary hover:bg-primary-container disabled:opacity-50 rounded-xl transition-all cursor-pointer"
                >
                  {addingComment ? '...' : t('sendBtn')}
                </button>
              </div>
              {/* isInfoRequest also moves the complaint to INFORMATION_REQUIRED
                  server side, which is only legal from IN_PROGRESS. */}
              {selected.status === 'IN_PROGRESS' && (
                <label className="flex items-center gap-2 text-[11px] font-bold text-on-surface-variant dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isInfoRequest}
                    onChange={(e) => setIsInfoRequest(e.target.checked)}
                    className="accent-primary"
                  />
                  {t('requestInfoLabel', 'Request information from the passenger (moves to Info Required)')}
                </label>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StaffConsole;
