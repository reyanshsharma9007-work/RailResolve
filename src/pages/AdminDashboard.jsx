import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { complaintService } from '../services/complaintService';
import { adminService } from '../services/adminService';
import { ROLES, normalizeRole } from '../constants/roles';

// Mirrors STATUS_TRANSITIONS in the backend's config/constants.js. Offering
// anything outside this set just produces a rejected request.
const STATUS_TRANSITIONS = {
  SUBMITTED: ['ASSIGNED'],
  ASSIGNED: ['ACKNOWLEDGED'],
  ACKNOWLEDGED: ['IN_PROGRESS'],
  IN_PROGRESS: ['INFORMATION_REQUIRED', 'ESCALATED', 'RESOLVED'],
  INFORMATION_REQUIRED: ['IN_PROGRESS'],
  ESCALATED: ['IN_PROGRESS'],
  RESOLVED: [],
  CLOSED: [],
};

const AdminDashboard = () => {
  const { user, role, t } = useAuth();
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [assignedOfficerId, setAssignedOfficerId] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Full detail (AI analysis, comments, history) for the open complaint.
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  // POST /complaints/:id/resolve is restricted to OFFICER and SENIOR_AUTHORITY
  // server side. An ADMIN account must not be offered an action it cannot run.
  const currentRole = normalizeRole(role);
  const canResolve =
    currentRole === ROLES.OFFICER || currentRole === ROLES.SENIOR_AUTHORITY;
  const canAssign =
    currentRole === ROLES.ADMIN || currentRole === ROLES.SENIOR_AUTHORITY;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // /admin/users is ADMIN-only, so an officer or senior authority viewing
      // this console gets a 403 there. That must not blank the complaint list.
      const [compRes, usersRes, analyticsRes] = await Promise.all([
        complaintService.getAll({ limit: 100 }), // Get up to 100 for admin view
        adminService.getUsers({ role: 'OFFICER' }).catch(() => null),
        adminService.getAnalytics().catch(() => null)
      ]);

      if (compRes.success) setComplaints(compRes.data.complaints || []);
      if (usersRes?.success) setOfficers(usersRes.data.users || []);
      // GET /admin/analytics -> { departmentWorkload, slaBreach, resolutionTime, feedback }
      if (analyticsRes?.success) setAnalytics(analyticsRes.data || null);
    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = (c.referenceNumber || c._id || '').toLowerCase().includes(q);
      const matchTrain = (c.journeyId?.trainId?.trainName || '').toLowerCase().includes(q);
      const matchPassenger = (c.passengerId?.name || '').toLowerCase().includes(q);
      return matchId || matchTrain || matchPassenger;
    }
    return true;
  });

  const totalCount = complaints.length;
  const inProgressCount = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
  const openCount = complaints.filter((c) => c.status === 'SUBMITTED' || c.status === 'OPEN').length;
  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

  const loadDetail = async (complaintId) => {
    try {
      setDetailLoading(true);
      const res = await complaintService.getById(complaintId);
      if (res.success) {
        setDetail(res.data);
        // Keep the row in the table in sync with the authoritative record.
        setSelectedComplaint(res.data.complaint);
        setNewStatus(res.data.complaint.status);
        setAssignedOfficerId(res.data.complaint.assignedOfficerId?._id || '');
      }
    } catch (err) {
      console.error('Failed to load complaint detail', err);
      setActionError(err.message || 'Failed to load complaint detail.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenDrawer = (complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status);
    setAssignedOfficerId(complaint.assignedOfficerId?._id || '');
    setResolutionNote('');
    setActionError(null);
    setCommentText('');
    setDetail(null);
    loadDetail(complaint._id);
  };

  const handleCloseDrawer = () => {
    setSelectedComplaint(null);
    setDetail(null);
    setActionError(null);
  };

  // Only transitions the backend state machine actually permits, minus the
  // ones this role is not authorised to perform.
  const nextStatusOptions = (() => {
    if (!selectedComplaint) return [];
    return (STATUS_TRANSITIONS[selectedComplaint.status] || []).filter((next) => {
      // ASSIGNED is reached through the assignment endpoint, not a raw status patch.
      if (next === 'ASSIGNED') return false;
      if (next === 'RESOLVED') return canResolve;
      return true;
    });
  })();

  // Assignment is only valid while the complaint is still SUBMITTED, and the
  // officer must belong to the complaint's own department.
  const assignableOfficers = selectedComplaint
    ? officers.filter(
        (o) =>
          String(o.departmentId?._id || o.departmentId || '') ===
          String(selectedComplaint.departmentId?._id || selectedComplaint.departmentId || '')
      )
    : [];

  const showAssignment = canAssign && selectedComplaint?.status === 'SUBMITTED';

  const noteRequired = newStatus === 'RESOLVED' && newStatus !== selectedComplaint?.status;
  const noteRelevant =
    noteRequired ||
    (newStatus === 'ESCALATED' && newStatus !== selectedComplaint?.status) ||
    (newStatus === 'INFORMATION_REQUIRED' && newStatus !== selectedComplaint?.status);

  const handleAddComment = async () => {
    if (!selectedComplaint || !commentText.trim()) return;
    try {
      setAddingComment(true);
      setActionError(null);
      await complaintService.addComment(selectedComplaint._id, {
        message: commentText.trim(),
        isInfoRequest: false,
      });
      setCommentText('');
      await loadDetail(selectedComplaint._id);
    } catch (err) {
      setActionError(err.message || 'Failed to add comment.');
    } finally {
      setAddingComment(false);
    }
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    
    // Client-side mirror of validateResolvePayload so the user gets the
    // message before the round trip, not after a 400.
    if (noteRequired && resolutionNote.trim().length < 5) {
      setActionError('A resolution note of at least 5 characters is required to resolve a complaint.');
      return;
    }

    const statusChanged = newStatus && newStatus !== selectedComplaint.status;
    const assignmentChanged =
      assignedOfficerId && assignedOfficerId !== (selectedComplaint.assignedOfficerId?._id || '');

    if (!statusChanged && !assignmentChanged) {
      setActionError('Nothing to update.');
      return;
    }

    try {
      setUpdating(true);
      setActionError(null);

      // Assigning an officer is its own endpoint and it also moves the
      // complaint SUBMITTED -> ASSIGNED server side, so it must run first.
      if (assignmentChanged) {
        await complaintService.assign(selectedComplaint._id, { officerId: assignedOfficerId });
      }

      if (statusChanged) {
        if (newStatus === 'RESOLVED') {
          // RESOLVED has a dedicated endpoint that requires a resolution note.
          await complaintService.resolve(selectedComplaint._id, { resolutionNote: resolutionNote.trim() });
        } else if (newStatus === 'ESCALATED') {
          await complaintService.escalate(selectedComplaint._id, { note: resolutionNote.trim() || undefined });
        } else {
          await complaintService.updateStatus(selectedComplaint._id, {
            status: newStatus,
            note: resolutionNote.trim() || undefined,
          });
        }
      }

      // Only close on a confirmed success; re-read the record from the server.
      await fetchData();
      await loadDetail(selectedComplaint._id);
      setResolutionNote('');
    } catch (err) {
      console.error("Failed to update complaint", err);
      // The modal stays open and no optimistic state is applied, so the UI
      // never shows a success that the backend rejected.
      setActionError(err.message || 'Failed to update complaint.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-4">refresh</span>
        <p className="text-on-surface dark:text-white font-bold text-sm">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-margin py-8">
      {/* Top KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest dark:bg-slate-900 p-5 rounded-2xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase">{t('totalLiveActive')}</span>
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
              <span className="material-symbols-outlined text-[20px]">assignment</span>
            </span>
          </div>
          <p className="text-3xl font-black text-on-surface dark:text-white mt-2">{totalCount}</p>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-1">{t('realtimeRakes')}</p>
        </div>

        <div className="bg-surface-container-lowest dark:bg-slate-900 p-5 rounded-2xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase">{t('inProgressAction')}</span>
            <span className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950 text-primary">
              <span className="material-symbols-outlined text-[20px]">engineering</span>
            </span>
          </div>
          <p className="text-3xl font-black text-on-surface dark:text-white mt-2">{inProgressCount}</p>
          <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold mt-1">
            {analytics?.resolutionTime?.sampleSize
              ? `${t('avgResolution')}: ${analytics.resolutionTime.averageResolutionHours}h`
              : t('crewDispatched')}
          </p>
        </div>

        <div className="bg-surface-container-lowest dark:bg-slate-900 p-5 rounded-2xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase">{t('pendingTriage')}</span>
            <span className="p-2 rounded-xl bg-red-50 dark:bg-red-950 text-error">
              <span className="material-symbols-outlined text-[20px]">pending_actions</span>
            </span>
          </div>
          <p className="text-3xl font-black text-on-surface dark:text-white mt-2">{openCount}</p>
          <p className="text-[11px] text-error dark:text-red-400 font-semibold mt-1">{t('awaitingAssignment')}</p>
        </div>

        <div className="bg-surface-container-lowest dark:bg-slate-900 p-5 rounded-2xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase">{t('resolvedToday')}</span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
            </span>
          </div>
          <p className="text-3xl font-black text-on-surface dark:text-white mt-2">{resolvedCount}</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {analytics?.slaBreach
              ? `${(100 - (analytics.slaBreach.breachRatePercent || 0)).toFixed(1)}% ${t('slaCompliance')}`
              : t('slaCompliance')}
          </p>
        </div>
      </div>

      {/* Filter Controls & Search Strip */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-4 rounded-2xl border border-outline-variant/60 dark:border-slate-800 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 block uppercase mb-1">{t('statusFilter')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">{t('allStatuses')}</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">{t('statusInProgress')}</option>
              <option value="RESOLVED">{t('statusResolved')}</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 block uppercase mb-1">{t('priorityFilter')}</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
            >
              <option value="ALL">{t('allPriorities')}</option>
              <option value="HIGH">{t('priorityHigh')}</option>
              <option value="MEDIUM">{t('priorityMedium')}</option>
              <option value="LOW">{t('priorityLow')}</option>
            </select>
          </div>
        </div>

        <div className="w-full md:w-72">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 block uppercase mb-1">{t('searchMatrix')}</label>
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

      {/* Main Complaints Matrix Table */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-lg overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-outline-variant/60 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-on-surface dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">table_chart</span>
            {t('liveOperationalStream')}
          </h3>
          <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 bg-surface-container-low dark:bg-slate-800 px-3 py-1 rounded-full">
            {t('showingRecords')} {filteredComplaints.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low dark:bg-slate-800 border-b border-outline-variant dark:border-slate-700 text-on-surface dark:text-white font-extrabold uppercase tracking-wider text-[11px]">
                <th className="p-4">{t('refIdDateCol')}</th>
                <th className="p-4">{t('passengerPnrCol')}</th>
                <th className="p-4">{t('trainLocationCol')}</th>
                <th className="p-4">{t('categoryIssueCol')}</th>
                <th className="p-4">{t('priorityCol')}</th>
                <th className="p-4">{t('statusSlaCol')}</th>
                <th className="p-4">{t('assignedCrewCol')}</th>
                <th className="p-4 text-right">{t('actionsCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 dark:divide-slate-800 font-semibold text-on-surface-variant dark:text-slate-300">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-on-surface-variant dark:text-slate-400 font-medium">
                    {t('noMatchingGrievances')}
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => (
                  <tr key={c._id} className="hover:bg-surface-container-low/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-bold text-on-surface dark:text-white">
                      <span className="text-primary font-mono block">{c.referenceNumber || c._id}</span>
                      <span className="text-[10px] text-on-surface-variant dark:text-slate-400 font-normal">{new Date(c.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-on-surface dark:text-white">{c.passengerId?.name || 'Passenger'}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-on-surface dark:text-white">{c.departmentId?.name || 'Unknown'}</p>
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
                      <div className="space-y-1">
                        <StatusBadge status={c.status} />
                        <p className="text-[10px] font-bold text-error dark:text-red-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">timer</span>
                          SLA Tracked
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-bold text-on-surface dark:text-white">
                      {c.assignedOfficerId?.name || <span className="text-error italic">{t('unassignedText')}</span>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDrawer(c)}
                          className="px-3 py-1.5 rounded-full bg-primary text-on-primary font-bold hover:bg-primary-container transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          <span>{t('triageBtn')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/track?id=${c._id}`)}
                          className="p-1.5 rounded-full bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container dark:hover:bg-slate-700 text-on-surface-variant dark:text-slate-300 transition-colors cursor-pointer"
                          title={t('viewTelemetryPage')}
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Triage & Resolution Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={Boolean(selectedComplaint)}
          onClose={handleCloseDrawer}
          title={`${t('triageConsoleHeader')} \u2022 ${selectedComplaint.referenceNumber || selectedComplaint._id}`}
        >
          <form onSubmit={handleSaveUpdate} className="space-y-4 text-left">
            <div className="p-4 bg-surface-container-low dark:bg-slate-800 rounded-2xl border border-outline-variant/60 dark:border-slate-700">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={selectedComplaint.status} />
                <StatusBadge priority={selectedComplaint.priority} />
              </div>
              <h4 className="text-sm font-extrabold text-on-surface dark:text-white mb-1">
                {selectedComplaint.title}
              </h4>
              <p className="text-xs text-on-surface-variant dark:text-slate-300 mb-2">
                {selectedComplaint.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-on-surface dark:text-white">
                <span>{t('passengerLabel', 'Passenger')}: {selectedComplaint.passengerId?.name || '—'}</span>
                <span>{selectedComplaint.departmentId?.name || '—'}</span>
              </div>
            </div>

            {/* AI analysis, fetched through Express (never directly from FastAPI). */}
            {detailLoading ? (
              <div className="p-3 rounded-2xl bg-surface-container-low dark:bg-slate-800 text-xs font-bold text-on-surface-variant dark:text-slate-300 flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[16px] text-primary">refresh</span>
                Loading analysis...
              </div>
            ) : detail?.aiAnalysis?.processingStatus === 'SUCCESS' ? (
              <div className="p-4 rounded-2xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700">
                <h5 className="text-xs font-extrabold text-on-surface dark:text-white mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
                  AI Analysis
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
                AI analysis unavailable for this complaint. The grievance itself is unaffected.
              </div>
            ) : detail ? (
              <div className="p-3 rounded-2xl bg-surface-container-low dark:bg-slate-800 text-xs font-medium text-on-surface-variant dark:text-slate-400">
                AI analysis is still processing.
              </div>
            ) : null}

            {/* Assignment — valid only while the complaint is SUBMITTED, and
                only to an officer in the complaint's own department. */}
            {showAssignment && (
              <div>
                <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">
                  {t('assignCrewLabel')}
                </label>
                <select
                  value={assignedOfficerId}
                  onChange={(e) => setAssignedOfficerId(e.target.value)}
                  className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Unassigned --</option>
                  {assignableOfficers.map((off) => (
                    <option key={off._id} value={off._id}>{off.name} ({off.email})</option>
                  ))}
                </select>
                {assignableOfficers.length === 0 && (
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-1 font-medium">
                    No officer is currently assigned to this department.
                  </p>
                )}
              </div>
            )}

            {/* Status — only the transitions the backend actually permits. */}
            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">
                {t('updateStatusLabel')}
              </label>
              {nextStatusOptions.length === 0 ? (
                <p className="text-xs font-medium text-on-surface-variant dark:text-slate-400 bg-surface-container-low dark:bg-slate-800 rounded-xl px-3.5 py-2.5">
                  {selectedComplaint.status === 'SUBMITTED'
                    ? 'Assign this complaint to an officer to move it forward.'
                    : selectedComplaint.status === 'IN_PROGRESS' && !canResolve
                    ? 'Resolution is performed by the assigned officer. You can escalate or request information.'
                    : 'No further status change is available from this state.'}
                </p>
              ) : (
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value={selectedComplaint.status}>
                    {selectedComplaint.status} (current)
                  </option>
                  {nextStatusOptions.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Note — shown only for the transitions that use one. */}
            {noteRelevant && (
              <div>
                <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">
                  {newStatus === 'RESOLVED' ? 'Resolution note (required, min 5 characters)' : 'Note (optional)'}
                </label>
                <textarea
                  rows="3"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder={
                    newStatus === 'RESOLVED'
                      ? 'Describe what was done to resolve this grievance.'
                      : 'Add context for this change.'
                  }
                  className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {actionError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-xl text-xs font-bold">
                {actionError}
              </div>
            )}

            <div className="pt-4 border-t border-outline-variant/60 dark:border-slate-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low dark:hover:bg-slate-800 rounded-full cursor-pointer"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-6 py-2.5 text-xs font-extrabold text-on-primary bg-primary hover:bg-primary-container disabled:opacity-50 rounded-full shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                {updating ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">save</span>
                )}
                <span>{updating ? 'Saving...' : t('saveTelemetryBtn')}</span>
              </button>
            </div>
          </form>

          {/* Comment thread — separate from the status form so a comment never
              triggers a status transition. */}
          <div className="mt-6 pt-4 border-t border-outline-variant/60 dark:border-slate-700 text-left">
            <h5 className="text-xs font-extrabold text-on-surface dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">forum</span>
              Comments ({detail?.comments?.length || 0})
            </h5>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
              {(detail?.comments || []).map((cm) => (
                <div
                  key={cm._id}
                  className="p-2.5 rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700"
                >
                  <span className="text-[10px] font-bold text-primary block">
                    {cm.authorId?.name || 'User'}
                  </span>
                  <p className="text-xs text-on-surface dark:text-white font-medium">{cm.message}</p>
                </div>
              ))}
              {detail && (detail.comments || []).length === 0 && (
                <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium">No comments yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment for the passenger..."
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
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;
