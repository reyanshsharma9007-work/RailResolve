import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { roleLabelKey } from '../constants/roles';

import Icon from '../components/common/Icon';
/**
 * Shown when a signed-in user reaches a route their role does not cover.
 * Deliberately a rendered page, not a redirect — redirecting between two routes
 * that neither role can enter is what produced the earlier loop.
 */
const AccessRestricted = ({ role, homeRoute = '/' }) => {
  const { t } = useAuth();

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="bg-surface-container-lowest dark:bg-slate-900 p-8 md:p-12 rounded-3xl border border-outline-variant/60 dark:border-slate-800 shadow-xl transition-colors">
        <Icon name="lock" className="text-5xl text-error mb-4" />
        <h1 className="text-xl md:text-2xl font-extrabold text-on-surface dark:text-white tracking-tight mb-2">
          {t('accessRestrictedTitle', 'Access Restricted')}
        </h1>
        <p className="text-xs md:text-sm text-on-surface-variant dark:text-slate-400 font-medium max-w-md mx-auto mb-2">
          {t(
            'accessRestrictedBody',
            'Your account does not have permission to open this page. If you believe this is wrong, contact your administrator.'
          )}
        </p>
        <p className="text-[11px] text-on-surface-variant dark:text-slate-500 font-bold uppercase tracking-wider mb-6">
          {t('roleLabel')} {t(roleLabelKey(role), role || '—')}
        </p>
        <Link
          to={homeRoute}
          className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-2"
        >
          <Icon name="home" className="text-[18px]" />
          <span>{t('backToDashboard', 'Back to my dashboard')}</span>
        </Link>
      </div>
    </div>
  );
};

export default AccessRestricted;
