import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import StatusBadge from '../components/common/StatusBadge';

const TicketBooking = () => {
  const { user, tickets, complaints, t } = useAuth();
  const navigate = useNavigate();

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
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold text-on-surface dark:text-white tracking-tight">
                {t('welcomeBack')}, {user?.name || "Rajesh Kumar"}
              </h1>
              <span className="bg-primary-fixed dark:bg-orange-950 text-on-primary-fixed dark:text-orange-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {user?.tier || t('verifiedPassenger')}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium mt-1">
              {t('activePnr')} <span className="font-bold text-primary font-mono">{user?.pnr || "2489-1058-39"}</span> • {t('contactLabel')} {user?.phone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/report')}
            className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">report_problem</span>
            <span>{t('reportOnboardGrievanceBtn')}</span>
          </button>
        </div>
      </div>

      {/* Grid Layout: Active Journeys & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 8 Cols: Upcoming Journeys & Tickets */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-base font-extrabold text-on-surface dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">confirmation_number</span>
              {t('activeBookings')}
            </h3>

            <div className="space-y-4">
              {tickets.map((ticket, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 hover:border-primary/40 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-primary bg-primary-fixed dark:bg-orange-950 dark:text-orange-200 px-2.5 py-0.5 rounded-full font-mono">
                        {t('pnrLabel')}: {ticket.pnr}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        {t('cnfConfirmed')}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-on-surface-variant dark:text-slate-300">
                      {ticket.class}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-on-surface dark:text-white">
                    {ticket.trainName} ({ticket.trainNo})
                  </h4>

                  <div className="grid grid-cols-2 gap-4 my-3 text-xs">
                    <div>
                      <span className="text-on-surface-variant dark:text-slate-400 text-[11px] block">{t('depLabel')}</span>
                      <span className="font-bold text-on-surface dark:text-white">{ticket.from}</span>
                      <span className="text-[11px] text-primary font-bold block">{ticket.depTime}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant dark:text-slate-400 text-[11px] block">{t('arrLabel')}</span>
                      <span className="font-bold text-on-surface dark:text-white">{ticket.to}</span>
                      <span className="text-[11px] text-primary font-bold block">{ticket.arrTime}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-outline-variant/40 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
                    <span className="text-on-surface dark:text-slate-200">
                      {t('berthDetails')} <span className="text-primary font-extrabold">Coach {ticket.coach}, Seat {ticket.seat}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {ticket.hasActiveGrievance ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/track?id=${ticket.activeGrievanceId}`)}
                          className="px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800 hover:bg-orange-200 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">troubleshoot</span>
                          <span>{t('trackActiveGrievance')} ({ticket.activeGrievanceId})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/report?pnr=${ticket.pnr}`)}
                          className="px-3 py-1.5 rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">report_problem</span>
                          <span>{t('fileGrievanceJourney')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Complaints History */}
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-base font-extrabold text-on-surface dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">history</span>
              {t('filedGrievancesHistory')}
            </h3>

            <div className="space-y-3">
              {complaints.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/track?id=${c.id}`)}
                  className="p-4 rounded-2xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 hover:border-primary/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-primary">{c.id}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-xs font-bold text-on-surface dark:text-white">{c.title}</p>
                    <p className="text-[11px] text-on-surface-variant dark:text-slate-400">{c.trainName} • Coach {c.coach}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-primary block">
                      {t('viewTelemetry')}
                    </span>
                    <span className="text-[10px] text-on-surface-variant dark:text-slate-400">{c.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Quick Telemetry Widgets */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
              {t('refundCompensation')}
            </h3>
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-2xl mb-3 text-xs">
              <span className="font-bold text-emerald-800 dark:text-emerald-200 block">{t('noRefundClaims')}</span>
              <span className="text-emerald-700 dark:text-emerald-300 font-medium text-[11px]">{t('verifiedCnf')}</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
              {t('accountProfile')}
            </h3>
            <div className="space-y-2 text-xs font-semibold text-on-surface-variant dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-outline-variant/40 dark:border-slate-700">
                <span>{t('loyaltyTier')}</span>
                <span className="text-primary font-bold">Gold Sleeper Club</span>
              </div>
              <div className="flex justify-between py-1 border-b border-outline-variant/40 dark:border-slate-700">
                <span>{t('verifiedMobile')}</span>
                <span className="text-on-surface dark:text-white font-bold">+91 98765 43210</span>
              </div>
              <div className="flex justify-between py-1">
                <span>{t('emergencyContact')}</span>
                <span className="text-on-surface dark:text-white font-bold">Kavita Kumar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketBooking;
