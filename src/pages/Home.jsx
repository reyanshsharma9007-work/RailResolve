import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import StatusBadge from '../components/common/StatusBadge';

const Home = () => {
  const [activeTab, setActiveTab] = useState('track'); // 'track' | 'report'
  const [searchRef, setSearchRef] = useState('RR-8942-VB');
  const [highlightCard, setHighlightCard] = useState(false);
  const [faqOpen, setFaqOpen] = useState({ 0: true });
  const navigate = useNavigate();
  const { t } = useAuth();

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (searchRef) {
      setHighlightCard(true);
      setTimeout(() => setHighlightCard(false), 1200);
      navigate(`/track?id=${encodeURIComponent(searchRef)}`);
    }
  };

  const toggleFaq = (idx) => {
    setFaqOpen((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const categories = [
    {
      icon: "cleaning_services",
      titleKey: "cleanlinessTitle",
      descKey: "cleanlinessDesc",
      cat: "cleanliness"
    },
    {
      icon: "ac_unit",
      titleKey: "electricalTitle",
      descKey: "electricalDesc",
      cat: "electrical"
    },
    {
      icon: "restaurant",
      titleKey: "cateringTitle",
      descKey: "cateringDesc",
      cat: "catering"
    },
    {
      icon: "shield",
      titleKey: "securityTitle",
      descKey: "securityDesc",
      cat: "security"
    },
    {
      icon: "medical_services",
      titleKey: "medicalTitle",
      descKey: "medicalDesc",
      cat: "medical"
    },
    {
      icon: "chair",
      titleKey: "amenitiesTitle",
      descKey: "amenitiesDesc",
      cat: "amenities"
    }
  ];

  const faqs = [
    { qKey: 'faq1Q', aKey: 'faq1A' },
    { qKey: 'faq2Q', aKey: 'faq2A' },
    { qKey: 'faq3Q', aKey: 'faq3A' },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* Top Hero Scenic Section */}
      <section className="relative w-full overflow-hidden -mt-20 pt-28 pb-16 min-h-[580px] lg:min-h-[640px] flex items-center justify-center">
        {/* Panoramic Background Image */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBTb-p2pfjB1qd7g1jHAop49nufW4QHSHFXkkD6C9VSjHrbtO-6bMHeaE97b7mjyERsPvmqso7j2feKBV50O7U7uE2ksG33i6zWi_J8qhy719IVU0UKniN4Nl9VpN4h6XVRsIDFCCTHr5grd9ivu-nfeXpkrlXjsdPKoWwMYS5fKcqEqB2aC0MeM7-rPfbnee88tzLwTtw5DgdKHr1la7ihb0UOjg67Hy1VwSYeZRplzTR5QWiSiirJ')"
          }}
        ></div>

        {/* Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/85 via-[#0f172a]/65 to-background dark:to-slate-950"></div>

        {/* Hero Content Container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-margin-mobile md:px-margin flex flex-col items-center text-center mt-4">
          <div className="inline-flex items-center gap-space-xs bg-surface-container-lowest/20 backdrop-blur-md px-space-md py-1.5 rounded-full mb-space-md shadow-sm border border-white/20">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></span>
            <span className="w-2 h-2 rounded-full bg-primary -ml-3.5"></span>
            <span className="text-xs font-bold text-white tracking-wider uppercase">
              {t('heroBadge')}
            </span>
            <span className="text-xs font-semibold text-orange-200">• 24/7 Live Triage</span>
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-4xl leading-tight drop-shadow-sm">
            {t('heroTitle')}
          </h1>
          <p className="text-base md:text-lg text-slate-200 max-w-2xl mt-space-sm mb-space-lg font-medium opacity-95">
            {t('heroSubtitle')}
          </p>

          {/* Primary Segmented Pill Selector */}
          <div className="inline-flex p-1.5 bg-black/40 backdrop-blur-xl rounded-full mb-space-md border border-white/20 shadow-xl">
            <button
              onClick={() => setActiveTab('track')}
              className={`flex items-center gap-space-xs px-space-lg py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === 'track'
                  ? 'bg-surface-container-lowest dark:bg-slate-800 text-on-surface dark:text-white shadow-md'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] text-primary">search_check</span>
              <span>{t('trackComplaintPnr')}</span>
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-space-xs px-space-lg py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === 'report'
                  ? 'bg-surface-container-lowest dark:bg-slate-800 text-on-surface dark:text-white shadow-md'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] text-primary-container">report_problem</span>
              <span>{t('reportOnboardGrievance')}</span>
            </button>
          </div>

          {/* TAB 1: TRACK COMPLAINT */}
          {activeTab === 'track' && (
            <div className="w-full max-w-2xl bg-surface-container-lowest/95 dark:bg-slate-900/95 backdrop-blur-2xl p-space-md md:p-space-lg rounded-2xl md:rounded-3xl shadow-2xl border border-white/80 dark:border-slate-700 transition-all">
              <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row items-center gap-space-sm">
                <div className="relative w-full flex items-center bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-space-md py-3 focus-within:border-primary transition-all">
                  <span className="material-symbols-outlined text-outline dark:text-slate-400 text-[22px] mr-space-xs">pin</span>
                  <input
                    type="text"
                    value={searchRef}
                    onChange={(e) => setSearchRef(e.target.value)}
                    placeholder={t('enterPnrPlaceholder')}
                    className="w-full bg-transparent border-none outline-none text-sm text-on-surface dark:text-white placeholder:text-outline font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-primary hover:bg-primary-container text-on-primary font-extrabold text-sm px-space-lg py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-space-xs shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">troubleshoot</span>
                  <span>{t('fetchTelemetry')}</span>
                </button>
              </form>

              {/* Sample Ticket Preview Card */}
              <div
                onClick={() => navigate('/track?id=RR-8942-VB')}
                className={`mt-space-md p-space-md bg-surface-container-low/80 dark:bg-slate-800/80 border border-outline-variant/60 dark:border-slate-700 rounded-2xl cursor-pointer text-left transition-all hover:border-primary ${
                  highlightCard ? 'ring-4 ring-primary' : ''
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary-fixed dark:bg-orange-950 dark:text-orange-200 px-2 py-0.5 rounded-full">
                      {t('pnrLabel')}: 2489105839
                    </span>
                    <span className="text-xs font-extrabold text-on-surface dark:text-white">
                      {t('refLabel')}: RR-8942-VB
                    </span>
                  </div>
                  <StatusBadge status="IN_PROGRESS" />
                </div>
                <p className="text-xs font-bold text-on-surface dark:text-white">
                  {t('sampleTrainDetails')}
                </p>
                <p className="text-xs text-on-surface-variant dark:text-slate-300 mt-1 line-clamp-1 font-medium">
                  {t('sampleIssueDesc')}
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-primary">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">schedule</span> {t('slaCountdown')} 12m 45s
                  </span>
                  <span className="flex items-center gap-1 hover:underline">
                    {t('viewTelemetry')} &rarr;
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QUICK REPORT */}
          {activeTab === 'report' && (
            <div className="w-full max-w-2xl bg-surface-container-lowest/95 dark:bg-slate-900/95 backdrop-blur-2xl p-space-md md:p-space-lg rounded-2xl md:rounded-3xl shadow-2xl border border-white/80 dark:border-slate-700 transition-all text-left">
              <h3 className="text-base font-extrabold text-on-surface dark:text-white mb-1">
                {t('lodgeGrievanceTitle')}
              </h3>
              <p className="text-xs text-on-surface-variant dark:text-slate-300 mb-4 font-medium">
                {t('lodgeGrievanceSub')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">{t('pnrUtsLabel')}</label>
                  <input
                    type="text"
                    placeholder="e.g. 2489105839"
                    className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">{t('coachSeatLabel')}</label>
                  <input
                    type="text"
                    placeholder="e.g. Coach B4, Seat 24"
                    className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">{t('selectCategory')}</label>
                <select className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold dark:text-white focus:outline-none focus:border-primary">
                  <option>{t('cleanlinessTitle')}</option>
                  <option>{t('electricalTitle')}</option>
                  <option>{t('cateringTitle')}</option>
                  <option>{t('securityTitle')}</option>
                  <option>{t('medicalTitle')}</option>
                </select>
              </div>
              <button
                onClick={() => navigate('/report')}
                className="w-full bg-primary hover:bg-primary-container text-on-primary font-extrabold text-sm py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>{t('proceedReport')} &rarr;</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Live Metrics Grid */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-margin -mt-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-outline-variant/60 dark:border-slate-800 flex items-center gap-4 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-slate-800 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[32px]">train</span>
            </div>
            <div>
              <p className="text-2xl font-black text-on-surface dark:text-white tracking-tight">102 Rakes</p>
              <p className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">{t('activeFleet')}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">{t('telemetryMonitored')}</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-outline-variant/60 dark:border-slate-800 flex items-center gap-4 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-slate-800 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[32px]">timer</span>
            </div>
            <div>
              <p className="text-2xl font-black text-on-surface dark:text-white tracking-tight">18.4 Mins</p>
              <p className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">{t('avgResolution')}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">{t('slaImprovement')}</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-outline-variant/60 dark:border-slate-800 flex items-center gap-4 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-slate-800 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[32px]">thumb_up</span>
            </div>
            <div>
              <p className="text-2xl font-black text-on-surface dark:text-white tracking-tight">96.8%</p>
              <p className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">{t('satisfactionIndex')}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">{t('grievancesResolved')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="w-full max-w-7xl mx-auto px-4 md:px-margin py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="bg-primary-fixed dark:bg-orange-950 text-on-primary-fixed dark:text-orange-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Category Services
          </span>
          <h2 className="text-2xl md:text-4xl font-extrabold text-on-surface dark:text-white tracking-tight mt-2">
            {t('categoryTitle')}
          </h2>
          <p className="text-sm text-on-surface-variant dark:text-slate-300 font-medium mt-2">
            {t('categorySub')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((item, idx) => (
            <div
              key={idx}
              onClick={() => navigate(`/report?category=${item.cat}`)}
              className="bg-surface-container-lowest dark:bg-slate-900 p-6 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-surface-container-low dark:bg-slate-800 group-hover:bg-primary group-hover:text-on-primary text-primary flex items-center justify-center mb-4 transition-colors">
                <span className="material-symbols-outlined text-[26px]">{item.icon}</span>
              </div>
              <h3 className="text-base font-extrabold text-on-surface dark:text-white group-hover:text-primary transition-colors">
                {t(item.titleKey)}
              </h3>
              <p className="text-xs text-on-surface-variant dark:text-slate-300 font-medium mt-2 leading-relaxed">
                {t(item.descKey)}
              </p>
              <div className="mt-4 flex items-center text-xs font-bold text-primary gap-1 group-hover:translate-x-1 transition-transform">
                <span>{t('fileReport')}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Citizen Charter & SLA Table */}
      <section className="w-full bg-surface-container-low dark:bg-slate-900 py-16 border-y border-outline-variant/60 dark:border-slate-800 transition-colors" id="charter">
        <div className="max-w-7xl mx-auto px-4 md:px-margin">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="bg-surface-container-lowest dark:bg-slate-800 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-outline-variant dark:border-slate-700">
                {t('resolutionMatrix')}
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white tracking-tight mt-2">
                {t('citizenCharterTitle')}
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-slate-300 font-medium max-w-md">
              {t('charterSub')}
            </p>
          </div>

          <div className="bg-surface-container-lowest dark:bg-slate-800 rounded-3xl shadow-lg border border-outline-variant/60 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container dark:bg-slate-700 border-b border-outline-variant dark:border-slate-600 text-on-surface dark:text-white font-extrabold">
                    <th className="p-4">{t('categoryCol')}</th>
                    <th className="p-4">{t('responderCol')}</th>
                    <th className="p-4">{t('targetSlaCol')}</th>
                    <th className="p-4">{t('escalationCol')}</th>
                    <th className="p-4">{t('resolutionModeCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 dark:divide-slate-700 font-semibold text-on-surface-variant dark:text-slate-300">
                  <tr>
                    <td className="p-4 font-bold text-on-surface dark:text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">medical_services</span>
                      {t('medicalEmergency')}
                    </td>
                    <td className="p-4">{t('medicalResponder')}</td>
                    <td className="p-4 text-error font-extrabold">{t('medicalTarget')}</td>
                    <td className="p-4">{t('medicalEscalation')}</td>
                    <td className="p-4">{t('medicalMode')}</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-on-surface dark:text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">ac_unit</span>
                      {t('hvacMalfunction')}
                    </td>
                    <td className="p-4">{t('hvacResponder')}</td>
                    <td className="p-4 text-orange-600 font-extrabold">{t('hvacTarget')}</td>
                    <td className="p-4">{t('hvacEscalation')}</td>
                    <td className="p-4">{t('hvacMode')}</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-on-surface dark:text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">cleaning_services</span>
                      {t('coachHygiene')}
                    </td>
                    <td className="p-4">{t('coachResponder')}</td>
                    <td className="p-4 text-amber-600 font-extrabold">{t('coachTarget')}</td>
                    <td className="p-4">{t('coachEscalation')}</td>
                    <td className="p-4">{t('coachMode')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="w-full max-w-4xl mx-auto px-4 md:px-margin py-16" id="faqs">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white tracking-tight">
            {t('faqsTitle')}
          </h2>
          <p className="text-xs text-on-surface-variant dark:text-slate-300 font-medium mt-2">
            {t('faqsSub')}
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((item, idx) => (
            <div key={idx} className="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/60 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 text-left font-bold text-sm text-on-surface dark:text-white flex items-center justify-between hover:bg-surface-container-low dark:hover:bg-slate-800 transition-colors"
              >
                <span>{t(item.qKey)}</span>
                <span className="material-symbols-outlined text-outline">
                  {faqOpen[idx] ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {faqOpen[idx] && (
                <div className="px-4 pb-4 pt-1 text-xs text-on-surface-variant dark:text-slate-300 font-medium leading-relaxed border-t border-outline-variant/40 dark:border-slate-800">
                  {t(item.aKey)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
