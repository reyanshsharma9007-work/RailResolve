import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const Footer = () => {
  const { t } = useAuth();

  return (
    <footer className="w-full bg-surface-container-lowest dark:bg-slate-900 border-t border-outline-variant/60 dark:border-slate-800 shadow-[0_1px_8px_rgba(0,0,0,0.04)] mt-space-xl transition-colors">
      <div className="w-full px-margin py-space-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-space-lg">
          {/* Col 1: Brand info */}
          <div className="space-y-space-sm">
            <div className="flex items-center gap-space-xs">
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-sm border border-outline-variant/60 shrink-0 mr-space-xs">
                <img
                  src="/logo.png"
                  alt="RailResolve Logo"
                  className="w-full h-full object-contain p-0.5"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuARKjRpS8q4xLg_BHxziIguPbATIZTcncz09UDxzJWwIN0oZjAoSpuzV0kQevuNMZNFqVd9P4X9hwdmvnH2ickefCQtI_5RGGduMmaqDbcx2gaV8cAT2PaVZjpsGHGzXdZ6lBz6w5MEbeRKYKx8VLqY9bgFjAmZ3oLYLIwhuxVowCmvVzF9tK4iBqnQAR44BJ2zJbFFJYvTSRb-2dhReMeKGzNGeUYUfSL4UCKuKd7QCMDhzQWqL2kC6qhaaSYi_NHv8Q";
                  }}
                />
              </div>
              <span className="text-xl font-extrabold text-on-surface dark:text-white tracking-tight">
                Rail<span className="text-primary">Resolve</span>
              </span>
              <span className="bg-primary-fixed dark:bg-orange-950 text-on-primary-fixed dark:text-orange-200 text-xs font-bold px-2 py-0.5 rounded-full">
                Gov of India
              </span>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium">
              {t('integratedRedressalSub')}
            </p>
            <div className="flex items-center gap-space-xs text-xs font-bold text-primary">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>{t('apiSync')}</span>
            </div>
          </div>

          {/* Col 2: Passenger Services */}
          <div>
            <h4 className="text-sm font-bold text-on-surface dark:text-white mb-space-sm">{t('passengerServices')}</h4>
            <ul className="space-y-space-xs text-xs font-medium text-on-surface-variant dark:text-slate-400">
              <li>
                <Link to="/report" className="hover:text-primary transition-colors">
                  {t('lodgeGrievancePnrUts')}
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-primary transition-colors">
                  {t('liveSlaStatusTracker')}
                </Link>
              </li>
              <li>
                <Link to="/report?cat=cleanliness" className="hover:text-primary transition-colors">
                  {t('coachCleanlinessAssistance')}
                </Link>
              </li>
              <li>
                <Link to="/report?cat=medical" className="hover:text-primary transition-colors">
                  {t('medicalSosRunningTrain')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Railway Administration */}
          <div>
            <h4 className="text-sm font-bold text-on-surface dark:text-white mb-space-sm">{t('railwayAdmin')}</h4>
            <ul className="space-y-space-xs text-xs font-medium text-on-surface-variant dark:text-slate-400">
              <li>
                <Link to="/admin" className="hover:text-primary transition-colors">
                  {t('adminPortal')}
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-primary transition-colors">
                  {t('slaBoard')}
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-primary transition-colors">
                  {t('rpfSecurityCommand')}
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-primary transition-colors">
                  {t('cateringMonitoring')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Official Helplines */}
          <div>
            <h4 className="text-sm font-bold text-on-surface dark:text-white mb-space-sm">{t('officialHelplines')}</h4>
            <div className="space-y-space-xs text-xs">
              <div className="p-space-sm bg-orange-50/70 dark:bg-slate-800 border border-orange-200/70 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <span className="text-on-surface dark:text-slate-200 font-bold">{t('tollFreeRailMadad')}</span>
                <span className="font-code-ticker text-primary font-extrabold text-sm">139</span>
              </div>
              <div className="p-space-sm bg-red-50/70 dark:bg-slate-800 border border-red-200/70 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <span className="text-on-surface dark:text-slate-200 font-bold">{t('rpfHelpline')}</span>
                <span className="font-code-ticker text-error font-extrabold text-sm">182</span>
              </div>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 pt-space-xs font-medium">
                {t('avgSlaResponse')}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-space-md bg-surface-container-low/60 dark:bg-slate-800/60 border border-outline-variant/60 dark:border-slate-800 rounded-xl px-space-md py-3 flex flex-col md:flex-row items-center justify-between gap-space-sm text-on-surface-variant dark:text-slate-400 text-xs font-medium">
          <div>{t('copyrightText')}</div>
          <div className="flex items-center gap-space-md">
            <a href="#charter" className="hover:text-primary transition-colors">{t('citizenCharter')}</a>
            <a href="#privacy" className="hover:text-primary transition-colors">{t('privacyPolicy')}</a>
            <a href="#terms" className="hover:text-primary transition-colors">{t('termsRedressal')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
