import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

const AdminDashboard = () => {
  const { complaints, updateComplaintStatus, t } = useAuth();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [assignedStaff, setAssignedStaff] = useState('');

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = c.id.toLowerCase().includes(q);
      const matchPnr = c.pnr.toLowerCase().includes(q);
      const matchTrain = c.trainName.toLowerCase().includes(q) || c.trainNo.includes(q);
      const matchPassenger = c.passengerName.toLowerCase().includes(q);
      return matchId || matchPnr || matchTrain || matchPassenger;
    }
    return true;
  });

  const totalCount = complaints.length;
  const inProgressCount = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
  const openCount = complaints.filter((c) => c.status === 'OPEN').length;
  const resolvedCount = complaints.filter((c) => c.status === 'RESOLVED').length;

  const handleOpenDrawer = (complaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status);
    setAssignedStaff(complaint.assignedTo || '');
  };

  const handleSaveUpdate = (e) => {
    e.preventDefault();
    if (selectedComplaint) {
      updateComplaintStatus(selectedComplaint.id, newStatus, assignedStaff);
      setSelectedComplaint(null);
    }
  };

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
          <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold mt-1">{t('crewDispatched')}</p>
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
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">98.4% {t('slaCompliance')}</p>
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
              <option value="OPEN">{t('statusOpen')}</option>
              <option value="IN_PROGRESS">{t('statusInProgress')}</option>
              <option value="RESOLVED">{t('statusResolved')}</option>
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
                  <tr key={c.id} className="hover:bg-surface-container-low/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-bold text-on-surface dark:text-white">
                      <span className="text-primary font-mono block">{c.id}</span>
                      <span className="text-[10px] text-on-surface-variant dark:text-slate-400 font-normal">{c.createdAt}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-on-surface dark:text-white">{c.passengerName}</p>
                      <span className="text-[11px] font-mono text-primary font-bold">{t('pnrLabel')}: {c.pnr}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-on-surface dark:text-white">{c.trainName}</p>
                      <span className="text-[11px] text-on-surface-variant dark:text-slate-400">{t('coachWord')} {c.coach}, {t('seatWord')} {c.seat}</span>
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
                          {c.slaRemaining}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-bold text-on-surface dark:text-white">
                      {c.assignedTo || <span className="text-error italic">{t('unassignedText')}</span>}
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
                          onClick={() => navigate(`/track?id=${c.id}`)}
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
          onClose={() => setSelectedComplaint(null)}
          title={`${t('triageConsoleHeader')} • ${selectedComplaint.id}`}
        >
          <form onSubmit={handleSaveUpdate} className="space-y-4 text-left">
            <div className="p-4 bg-surface-container-low dark:bg-slate-800 rounded-2xl border border-outline-variant/60 dark:border-slate-700">
              <p className="text-xs font-bold text-primary font-mono mb-1">
                {t('pnrLabel')}: {selectedComplaint.pnr} • {selectedComplaint.trainName}
              </p>
              <h4 className="text-sm font-extrabold text-on-surface dark:text-white mb-1">
                {selectedComplaint.title}
              </h4>
              <p className="text-xs text-on-surface-variant dark:text-slate-300 mb-2">
                {selectedComplaint.description}
              </p>
              <div className="flex items-center gap-4 text-xs font-bold text-on-surface dark:text-white">
                <span>{t('passengerLabel', 'Passenger')}: {selectedComplaint.passengerName} ({selectedComplaint.passengerPhone})</span>
                <span>{t('coachWord')} {selectedComplaint.coach}, {t('seatWord')} {selectedComplaint.seat}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">
                {t('updateStatusLabel')}
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
              >
                <option value="OPEN">{t('statusOpen')}</option>
                <option value="IN_PROGRESS">{t('statusInProgress')}</option>
                <option value="RESOLVED">{t('statusResolved')}</option>
                <option value="ESCALATED">{t('statusEscalated')}</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">
                {t('assignCrewLabel')}
              </label>
              <input
                type="text"
                value={assignedStaff}
                onChange={(e) => setAssignedStaff(e.target.value)}
                placeholder="e.g. Rakesh Sharma (OBHS Lead)"
                className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="pt-4 border-t border-outline-variant/60 dark:border-slate-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant dark:text-slate-400 hover:bg-surface-container-low dark:hover:bg-slate-800 rounded-full cursor-pointer"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-extrabold text-on-primary bg-primary hover:bg-primary-container rounded-full shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>{t('saveTelemetryBtn')}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;
