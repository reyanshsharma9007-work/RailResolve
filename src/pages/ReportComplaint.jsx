import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ReportComplaint = () => {
  const [searchParams] = useSearchParams();
  const preCategory = searchParams.get('category') || 'cleanliness';
  const { addComplaint, user, t } = useAuth();
  const navigate = useNavigate();

  const [pnr, setPnr] = useState(user?.pnr || '2489-1058-39');
  const [trainNo, setTrainNo] = useState('20901');
  const [coach, setCoach] = useState('B4');
  const [seat, setSeat] = useState('24 Lower');
  const [category, setCategory] = useState(
    preCategory === 'electrical'
      ? 'Electrical / AC Cooling'
      : preCategory === 'medical'
      ? 'Medical Emergency'
      : preCategory === 'catering'
      ? 'Catering / Meal Quality'
      : preCategory === 'security'
      ? 'Security & RPF Protection'
      : preCategory === 'amenities'
      ? 'Berth & Seat Amenities'
      : 'Coach Cleanliness'
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [photoName, setPhotoName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const newId = `RR-${Math.floor(1000 + Math.random() * 9000)}-VB`;
    const newComplaintObj = {
      id: newId,
      pnr,
      trainNo,
      trainName: 'Vande Bharat Express',
      coach,
      seat,
      passengerName: user?.name || 'Rajesh Kumar',
      passengerPhone: user?.phone || '+91 98765 43210',
      category,
      title: title || `${category} Issue reported in Coach ${coach}`,
      description: description || 'Grievance submitted via RailResolve Web Portal.',
      priority,
      status: 'OPEN',
      slaRemaining: priority === 'HIGH' ? '15m 00s' : '30m 00s',
      createdAt: new Date().toLocaleString(),
      assignedTo: 'Automated Triage (Routing to Control Room)',
      station: 'En-route Telemetry Active',
      speedTelemetry: '128 km/h',
      timeline: [
        {
          stage: 'Submitted',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          desc: 'Complaint filed via RailResolve Portal',
          completed: true,
          current: true
        },
        { stage: 'Automated Triage', time: 'Pending', desc: 'Routing to Divisional Control', completed: false },
        { stage: 'Staff Assigned', time: 'Pending', desc: 'Awaiting crew dispatch', completed: false },
        { stage: 'Onboard Action', time: 'Pending', desc: 'On-board inspection', completed: false },
        { stage: 'Resolved & Closed', time: 'Pending', desc: 'Passenger confirmation', completed: false }
      ],
      chatMessages: [
        {
          sender: 'system',
          text: `RailResolve System: Complaint ${newId} logged. Routing to Captain & Triage Team.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    addComplaint(newComplaintObj);
    navigate(`/track?id=${newId}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-margin py-8">
      {/* Header card */}
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-xl mb-8 transition-colors">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-fixed dark:bg-orange-950 text-on-primary-fixed dark:text-orange-200 text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          {t('lodgeGrievanceBadge')}
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white tracking-tight">
          {t('lodgeGrievanceHeader')}
        </h1>
        <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium mt-1">
          {t('lodgeGrievanceNotice')}
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-surface-container-lowest dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-lg space-y-6 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('pnrUtsLabel')}</label>
            <input
              type="text"
              required
              value={pnr}
              onChange={(e) => setPnr(e.target.value)}
              placeholder="e.g. 2489105839"
              className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('trainNoLabel')}</label>
            <input
              type="text"
              required
              value={trainNo}
              onChange={(e) => setTrainNo(e.target.value)}
              placeholder="e.g. 20901 Vande Bharat Express"
              className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('coachNoLabel')}</label>
            <input
              type="text"
              required
              value={coach}
              onChange={(e) => setCoach(e.target.value)}
              placeholder="e.g. B4"
              className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('seatNoLabel')}</label>
            <input
              type="text"
              required
              value={seat}
              onChange={(e) => setSeat(e.target.value)}
              placeholder="e.g. 24 Lower"
              className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('categoryLabel')}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all"
          >
            <option value="Coach Cleanliness">{t('cleanlinessTitle')}</option>
            <option value="Electrical / AC Cooling">{t('electricalTitle')}</option>
            <option value="Catering / Meal Quality">{t('cateringTitle')}</option>
            <option value="Security & RPF Protection">{t('securityTitle')}</option>
            <option value="Medical Emergency">{t('medicalTitle')}</option>
            <option value="Berth & Seat Amenities">{t('amenitiesTitle')}</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('issueHeadlineLabel')}</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. AC unit blowing warm air above berth 24"
            className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('detailedDescLabel')}</label>
          <textarea
            rows="4"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide specific details to help the on-board technician resolve the issue quickly..."
            className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl p-4 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('urgencyLabel')}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary transition-all"
            >
              <option value="HIGH">{t('priorityHigh')} (15 Mins)</option>
              <option value="MEDIUM">{t('priorityMedium')} (30 Mins)</option>
              <option value="LOW">{t('priorityLow')} (45 Mins)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">{t('uploadPhotoLabel')}</label>
            <div className="relative flex items-center bg-surface-container-low dark:bg-slate-800 border border-dashed border-outline dark:border-slate-700 rounded-2xl px-4 py-2.5 cursor-pointer hover:bg-surface-container dark:hover:bg-slate-750 transition-colors">
              <span className="material-symbols-outlined text-outline dark:text-slate-400 text-[20px] mr-2">cloud_upload</span>
              <span className="text-xs font-bold text-on-surface-variant dark:text-slate-300 truncate">
                {photoName || 'Click to select image file'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoName(e.target.files[0]?.name || '')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-primary hover:bg-primary-container text-on-primary font-extrabold text-sm py-4 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
          <span>{t('submitGrievanceBtn')} &rarr;</span>
        </button>
      </form>
    </div>
  );
};

export default ReportComplaint;
