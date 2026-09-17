import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

const Complaint = () => {
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const { complaints, addChatMessage, t } = useAuth();
  const navigate = useNavigate();

  const activeComplaint =
    complaints.find((c) => c.id.toLowerCase() === (queryId || '').toLowerCase()) ||
    complaints[0];

  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [userRating, setUserRating] = useState(5);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim() && activeComplaint) {
      addChatMessage(activeComplaint.id, {
        sender: 'passenger',
        text: chatInput,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setChatInput('');
    }
  };

  if (!activeComplaint) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-on-surface dark:text-white">No Grievance Found</h2>
        <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-2">
          The requested reference number was not found in active telemetry.
        </p>
        <Link to="/" className="mt-4 inline-block px-4 py-2 bg-primary text-on-primary rounded-full text-xs font-bold">
          Return to Overview
        </Link>
      </div>
    );
  }

  const getStageTitle = (stage) => {
    if (stage === 'Submitted') return t('stageSubmitted');
    if (stage === 'Automated Triage') return t('stageTriage');
    if (stage === 'Staff Assigned') return t('stageStaff');
    if (stage === 'Onboard Action') return t('stageAction');
    if (stage === 'Resolved & Closed') return t('stageResolved');
    return stage;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-margin py-8">
      {/* Breadcrumb strip */}
      <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant dark:text-slate-400 mb-6">
        <Link to="/" className="hover:text-primary transition-colors">{t('overview')}</Link>
        <span>/</span>
        <span className="text-on-surface dark:text-slate-200">{t('grievanceTelemetryLifecycle')}</span>
        <span>/</span>
        <span className="text-primary font-mono">{activeComplaint.id}</span>
      </div>

      {/* Main Header Banner */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="text-xl md:text-2xl font-black text-on-surface dark:text-white tracking-tight">
              {activeComplaint.id}
            </span>
            <StatusBadge status={activeComplaint.status} />
            <StatusBadge priority={activeComplaint.priority} />
          </div>
          <h1 className="text-base md:text-lg font-bold text-on-surface dark:text-white">
            {activeComplaint.title}
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium mt-1">
            Logged on {activeComplaint.createdAt} • Category: <span className="font-bold text-primary">{activeComplaint.category}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-4 py-2 rounded-2xl bg-orange-50 dark:bg-slate-800 border border-orange-200 dark:border-slate-700 text-left">
            <span className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase block">{t('guaranteedSlaTarget')}</span>
            <span className="text-sm font-black text-primary font-mono flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">timer</span>
              {activeComplaint.slaRemaining}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setChatModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span>{t('liveChatCaptain')}</span>
          </button>
        </div>
      </div>

      {/* 5-Step Lifecycle Timeline Stepper */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-lg mb-8 transition-colors">
        <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">timeline</span>
          {t('resolutionProgressLifecycle')}
        </h3>

        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {activeComplaint.timeline.map((step, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all ${
                  step.current
                    ? 'bg-orange-50/70 dark:bg-orange-950/60 border-primary ring-2 ring-primary/20 shadow-md'
                    : step.completed
                    ? 'bg-surface-container-low dark:bg-slate-800 border-outline-variant/60 dark:border-slate-700'
                    : 'bg-surface-container-lowest dark:bg-slate-900 border-outline-variant/40 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.completed
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container dark:bg-slate-700 text-on-surface-variant dark:text-slate-300'
                    }`}
                  >
                    {step.completed ? '✓' : idx + 1}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-on-surface-variant dark:text-slate-400">
                    {step.time}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-on-surface dark:text-white">{getStageTitle(step.stage)}</h4>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-300 mt-1 leading-snug font-medium">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 8 Cols: Telemetry & Details */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">description</span>
              {t('detailedDescEvidence')}
            </h3>
            <p className="text-xs text-on-surface-variant dark:text-slate-300 font-medium leading-relaxed mb-4">
              {activeComplaint.description}
            </p>
            <div className="p-4 bg-surface-container-low dark:bg-slate-800 rounded-2xl border border-outline-variant/60 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="font-bold text-on-surface dark:text-white">{t('attachmentsPhotos')}</span>
              <span className="text-primary font-bold flex items-center gap-1 cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">photo_library</span>
                1 Photo Attached
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">support_agent</span>
              {t('assignedCrewLog')}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface-container-low dark:bg-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-surface dark:text-white">{t('assignedExecutive')}</p>
                  <p className="text-primary font-extrabold">{activeComplaint.assignedTo}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setChatModalOpen(true)}
                  className="px-3 py-1.5 rounded-full bg-primary text-on-primary font-bold text-[11px] hover:bg-primary-container transition-colors cursor-pointer"
                >
                  {t('chatNow')}
                </button>
              </div>
              <div className="p-3 bg-surface-container-low dark:bg-slate-800 rounded-xl">
                <p className="font-bold text-on-surface dark:text-white">{t('controlRoom')}</p>
                <p className="text-on-surface-variant dark:text-slate-300 font-medium">Northern Railway - Executive Control</p>
              </div>
            </div>
          </div>

          {/* Feedback Form */}
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-2">
              {t('passengerSatisfaction')}
            </h3>
            <p className="text-xs text-on-surface-variant dark:text-slate-300 mb-4 font-medium">
              {t('rateExperience')}
            </p>
            {feedbackSubmitted ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-center">
                {t('ratingThankYou')}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setUserRating(star)}
                      className={`text-2xl transition-transform hover:scale-110 cursor-pointer ${
                        star <= userRating ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFeedbackSubmitted(true)}
                  className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-full shadow-xs hover:bg-primary-container active:scale-95 transition-all cursor-pointer"
                >
                  {t('submitRating')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Train & Journey Telemetry */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-sm transition-colors">
            <h3 className="text-sm font-extrabold text-on-surface dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">train</span>
              {t('journeyTelemetry')}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-outline-variant/40 dark:border-slate-700">
                <span className="text-on-surface-variant dark:text-slate-400">{t('trainNameLabel')}</span>
                <span className="font-bold text-on-surface dark:text-white">{activeComplaint.trainName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-outline-variant/40 dark:border-slate-700">
                <span className="text-on-surface-variant dark:text-slate-400">{t('trainNoLabel')}</span>
                <span className="font-bold text-primary font-mono">{activeComplaint.trainNo}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-outline-variant/40 dark:border-slate-700">
                <span className="text-on-surface-variant dark:text-slate-400">{t('pnrNoLabel')}</span>
                <span className="font-bold text-primary font-mono">{activeComplaint.pnr}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-outline-variant/40 dark:border-slate-700">
                <span className="text-on-surface-variant dark:text-slate-400">{t('coachBerthLabel')}</span>
                <span className="font-bold text-on-surface dark:text-white">Coach {activeComplaint.coach}, Seat {activeComplaint.seat}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-outline-variant/40 dark:border-slate-700">
                <span className="text-on-surface-variant dark:text-slate-400">{t('currentSpeedLabel')}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{activeComplaint.speedTelemetry}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-on-surface-variant dark:text-slate-400">{t('nearestStationLabel')}</span>
                <span className="font-bold text-on-surface dark:text-white">{activeComplaint.station}</span>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-slate-900 border border-orange-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-xs transition-colors">
            <h4 className="font-extrabold text-on-surface dark:text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">headset_mic</span>
              {t('needEmergencyHelp')}
            </h4>
            <p className="text-on-surface-variant dark:text-slate-300 font-medium mb-3">
              {t('emergencyDesc')}
            </p>
            <a
              href="tel:139"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary text-on-primary font-extrabold shadow-sm hover:bg-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
              <span>{t('dialRailMadad')}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Live Chat Modal */}
      {chatModalOpen && (
        <Modal
          isOpen={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          title={`${t('liveChatHeader')} • ${activeComplaint.id}`}
        >
          <div className="flex flex-col h-[400px]">
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-surface-container-low dark:bg-slate-800 rounded-2xl mb-4 border border-outline-variant/60 dark:border-slate-700">
              {activeComplaint.chatMessages.length === 0 ? (
                <p className="text-xs text-on-surface-variant dark:text-slate-400 text-center py-8">
                  {t('noMessages')}
                </p>
              ) : (
                activeComplaint.chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.sender === 'passenger' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-2xl text-xs font-medium ${
                        msg.sender === 'passenger'
                          ? 'bg-primary text-on-primary rounded-br-none'
                          : msg.sender === 'system'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                          : 'bg-surface-container-lowest dark:bg-slate-700 text-on-surface dark:text-white border border-outline-variant/60 dark:border-slate-600 rounded-bl-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <span className="text-[9px] opacity-75 mt-1 block text-right">
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t('typeMessagePlaceholder')}
                className="flex-1 bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-2xl hover:bg-primary-container shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {t('sendBtn')}
              </button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Complaint;
