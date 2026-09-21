import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import StatusBadge from '../components/common/StatusBadge';
import AddJourneyModal from '../components/common/AddJourneyModal';
import { journeyService } from '../services/journeyService';
import { complaintService } from '../services/complaintService';

import Icon from '../components/common/Icon';
const TicketBooking = () => {
  const { user, t } = useAuth();
  const navigate = useNavigate();

  const [journeys, setJourneys] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [journeyModalOpen, setJourneyModalOpen] = useState(false);
  const [journeyCreatedMsg, setJourneyCreatedMsg] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch journeys and complaints concurrently
        const [journeysRes, complaintsRes] = await Promise.all([
          journeyService.getAll(),
          complaintService.getAll()
        ]);
        
        if (journeysRes.success) setJourneys(journeysRes.data.journeys || []);
        if (complaintsRes.success) setComplaints(complaintsRes.data.complaints || []);
      } catch (err) {
        console.error("Failed to fetch passenger data", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-margin py-8">
      {/* Top Banner Card */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-md ring-2 ring-primary/20 shrink-0">
            <img
              src={user?.avatar || "/logo.png"}
              alt="Passenger Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/logo.png";
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-on-surface dark:text-white tracking-tight">
                {t('welcomeBack')}, {user?.name || "Passenger"}
              </h1>
              <span className="bg-primary-fixed dark:bg-orange-950 text-on-primary-fixed dark:text-orange-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {user?.tier || t('verifiedPassenger')}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium mt-1">
              {t('contactLabel')} {user?.phone || 'Not provided'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setJourneyModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 hover:border-primary text-on-surface dark:text-white font-extrabold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Icon name="add_circle" className="text-[18px] text-primary" />
            <span>{t('addJourneyBtn', 'Add Journey')}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/report')}
            className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Icon name="report_problem" className="text-[18px]" />
            <span>{t('reportOnboardGrievanceBtn')}</span>
          </button>
        </div>
      </div>

      {journeyCreatedMsg && (
        <div className="mb-6 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3">
          <span>{journeyCreatedMsg}</span>
          <button
            type="button"
            onClick={() => navigate('/report')}
            className="px-4 py-2 rounded-full bg-primary text-on-primary font-extrabold shrink-0 cursor-pointer"
          >
            {t('reportOnboardGrievanceBtn')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <Icon name="refresh" className="animate-spin text-4xl text-primary mb-4" />
          <p className="text-on-surface dark:text-white font-bold text-sm">Loading your journeys and complaints...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm font-bold text-center">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 8 Cols: Upcoming Journeys & Tickets */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
              <h3 className="text-base font-extrabold text-on-surface dark:text-white mb-4 flex items-center gap-2">
                <Icon name="confirmation_number" className="text-primary text-[20px]" />
                {t('activeBookings')}
              </h3>

              <div className="space-y-4">
                {journeys.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-on-surface-variant dark:text-slate-400 mb-3">
                      No journey found. Add a journey to report a grievance.
                    </p>
                    <button
                      type="button"
                      onClick={() => setJourneyModalOpen(true)}
                      className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-extrabold text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Icon name="add_circle" className="text-[18px]" />
                      <span>{t('addJourneyBtn', 'Add Journey')}</span>
                    </button>
                  </div>
                ) : (
                  journeys.map((ticket, idx) => (
                    <div
                      key={ticket._id || idx}
                      className="p-5 rounded-2xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 hover:border-primary/40 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-primary bg-primary-fixed dark:bg-orange-950 dark:text-orange-200 px-2.5 py-0.5 rounded-full font-mono">
                            {t('pnrLabel')}: {ticket.pnr || 'N/A'}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                            {t('cnfConfirmed')}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-on-surface-variant dark:text-slate-300">
                          {new Date(ticket.travelDate).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="text-sm font-extrabold text-on-surface dark:text-white">
                        {ticket.trainId?.trainName} ({ticket.trainId?.trainNumber})
                      </h4>

                      <div className="grid grid-cols-2 gap-4 my-3 text-xs">
                        <div>
                          <span className="text-on-surface-variant dark:text-slate-400 text-[11px] block">{t('depLabel')}</span>
                          <span className="font-bold text-on-surface dark:text-white">{ticket.boardingStationId?.name}</span>
                        </div>
                        <div>
                          <span className="text-on-surface-variant dark:text-slate-400 text-[11px] block">{t('arrLabel')}</span>
                          <span className="font-bold text-on-surface dark:text-white">{ticket.destinationStationId?.name}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-outline-variant/40 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
                        <span className="text-on-surface dark:text-slate-200">
                          {t('berthDetails')} <span className="text-primary font-extrabold">{t('coachWord')} {ticket.coach || 'N/A'}, {t('seatWord')} {ticket.seat || 'N/A'}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/report?journeyId=${ticket._id}`)}
                            className="px-3 py-1.5 rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                          >
                            <Icon name="report_problem" className="text-[14px]" />
                            <span>{t('fileGrievanceJourney')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Past Complaints History */}
            <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
              <h3 className="text-base font-extrabold text-on-surface dark:text-white mb-4 flex items-center gap-2">
                <Icon name="history" className="text-primary text-[20px]" />
                {t('filedGrievancesHistory')}
              </h3>

              <div className="space-y-3">
                {complaints.length === 0 ? (
                  <p className="text-sm text-on-surface-variant dark:text-slate-400 text-center py-4">No filed grievances found.</p>
                ) : (
                  complaints.map((c) => (
                    <div
                      key={c._id || c.id}
                      onClick={() => navigate(`/track?id=${c._id || c.id}`)}
                      className="p-4 rounded-2xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 hover:border-primary/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-primary">{c.referenceNumber || c.id}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs font-bold text-on-surface dark:text-white">{c.title || c.category}</p>
                        <p className="text-[11px] text-on-surface-variant dark:text-slate-400">{c.journeyId?.trainId?.trainName || c.trainName} • {t('coachWord')} {c.journeyId?.coach || c.coach || 'N/A'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-on-surface-variant dark:text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Quick Telemetry Widgets */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
              <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-3 flex items-center gap-2">
                <Icon name="payments" className="text-primary text-[20px]" />
                {t('refundCompensation')}
              </h3>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-2xl mb-3 text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-200 block">{t('noRefundClaims')}</span>
                <span className="text-emerald-700 dark:text-emerald-300 font-medium text-[11px]">{t('verifiedCnf')}</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
              <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-3 flex items-center gap-2">
                <Icon name="badge" className="text-primary text-[20px]" />
                {t('accountProfile')}
              </h3>
              <div className="space-y-2 text-xs font-semibold text-on-surface-variant dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-outline-variant/40 dark:border-slate-700">
                  <span>{t('loyaltyTier')}</span>
                  <span className="text-primary font-bold">{t('loyaltyClub')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-outline-variant/40 dark:border-slate-700">
                  <span>{t('verifiedMobile')}</span>
                  <span className="text-on-surface dark:text-white font-bold">{user?.phone || '+91 98765 43210'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddJourneyModal
        isOpen={journeyModalOpen}
        onClose={() => setJourneyModalOpen(false)}
        onCreated={(journey) => {
          // Make the new journey usable straight away, then reconcile with the
          // server so the populated train/station names show up.
          setJourneys((prev) => [journey, ...prev]);
          setJourneyCreatedMsg('Journey added. You can now report a grievance for it.');
          setJourneyModalOpen(false);
          journeyService
            .getAll()
            .then((res) => {
              if (res.success) setJourneys(res.data.journeys || []);
            })
            .catch(() => {});
        }}
      />
    </div>
  );
};

export default TicketBooking;
