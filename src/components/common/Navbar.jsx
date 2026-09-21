import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { notificationService } from '../../services/notificationService';
import { isStaff, isPassenger, homeRouteForRole, roleLabelKey, normalizeRole } from '../../constants/roles';

import Icon from './Icon';
const Navbar = () => {
  const { user, role, logout, language, toggleLanguage, isAuthenticated, theme, toggleTheme, t } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  React.useEffect(() => {
    if (isAuthenticated) {
      notificationService.getAll({ limit: 5 }).then(res => {
        if (res.success) {
          setNotifications(res.data.notifications || []);
        }
      }).catch(err => console.error("Failed to load notifications", err));
    }
  }, [isAuthenticated]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {}
  };

  // Navigation is derived from the authenticated role, so an officer never sees
  // passenger complaint-creation controls and vice versa.
  const currentRole = normalizeRole(role);
  const navLinks = (() => {
    if (!isAuthenticated) {
      return [{ to: '/', key: 'overview' }];
    }
    if (isPassenger(currentRole)) {
      return [
        { to: '/', key: 'overview' },
        { to: '/passenger', key: 'myTickets' },
        { to: '/report', key: 'reportGrievance' },
      ];
    }
    return [
      { to: '/', key: 'overview' },
      { to: homeRouteForRole(currentRole), key: 'consoleNavLabel', fallback: 'Console' },
    ];
  })();

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-surface-container/60 dark:border-slate-800 shadow-[0_2px_12px_rgba(15,23,42,0.05)] transition-colors">
      <div className="h-20 w-full px-4 md:px-margin flex items-center justify-between gap-4">
        {/* Left Section: Logo */}
        <div className="flex items-center gap-space-md">
          <Link
            to="/"
            className="flex items-center gap-space-sm group focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none rounded-xl p-1 transition-all"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-md ring-2 ring-primary/20 group-hover:ring-primary/50 group-hover:scale-[1.02] shrink-0 transition-all">
              <img
                src="/logo.png"
                alt="RailResolve Logo"
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuBikO5Q8O6sJKFRh2TyU_yIecJEbNSt2V5Bhvpfk-LMP2L1BwRgK-t0Tx2j2c8JH4A9rcKSQsKpZS37oFtWFqhFBWCqrJBxHbe_An59ILWQgpEKaTt_yBWGjAPnyLRhHhwCSXRBqTa0tJBLlQ5sJlhWxzZIXIO4WDhS9m2oTjVowIB1kvLZFSHTzi6I1tvbvhX6rcD5EHMY3cMgQeLROo1bXgeyN_5BdsqNByeMAPzXdvRkagVO38Wxjm2-Vj_cdKetmA";
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-space-xs">
                <span className="text-xl font-extrabold text-on-surface dark:text-white tracking-tight group-hover:text-primary transition-colors">
                  Rail<span className="text-primary">Resolve</span>
                </span>
              </div>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium hidden sm:block">
                Indian Railways Grievance Redressal Portal
              </p>
            </div>
          </Link>
        </div>

        {/* Right Section: Language, Emergency, Nav Links, Dark Mode & Sign In/Profile */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Bilingual Language Switcher */}
          <div className="flex items-center bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 p-0.5 rounded-full text-xs font-bold text-on-surface-variant dark:text-slate-300">
            <button
              type="button"
              onClick={() => toggleLanguage('en')}
              className={`px-2.5 py-1 rounded-full font-bold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-95 ${
                language === 'en'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'hover:text-on-surface dark:hover:text-white hover:bg-surface-container/60 dark:hover:bg-slate-700/60 text-on-surface-variant dark:text-slate-300'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => toggleLanguage('hi')}
              className={`px-2.5 py-1 rounded-full font-bold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-95 ${
                language === 'hi'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'hover:text-on-surface dark:hover:text-white hover:bg-surface-container/60 dark:hover:bg-slate-700/60 text-on-surface-variant dark:text-slate-300'
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Emergency Helpline Pill */}
          <a
            href="tel:139"
            className="hidden sm:flex items-center gap-1.5 bg-error-container text-on-error-container dark:bg-red-950/80 dark:text-red-200 px-3 py-1.5 rounded-full text-xs font-bold border border-error/20 hover:bg-red-200 dark:hover:bg-red-900/80 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-error/50 focus-visible:outline-none active:scale-95 transition-all whitespace-nowrap"
          >
            <Icon name="call" className="text-[16px]" />
            <span>{t('emergencyDial')}</span>
          </a>

          {/* Nav Links — role aware */}
          <nav className="hidden md:flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.to + link.key}
                to={link.to}
                className={`text-sm whitespace-nowrap transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none rounded-lg px-2 py-1 ${
                  isActive(link.to) ? 'text-primary font-extrabold' : 'font-semibold text-on-surface-variant dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-surface-container-low dark:hover:bg-slate-800'
                }`}
              >
                {t(link.key, link.fallback)}
              </Link>
            ))}
          </nav>

          {/* Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 text-on-surface-variant dark:text-slate-200 hover:text-primary dark:hover:text-primary hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} className="text-[20px]" />
          </button>

          {/* Notifications Bell */}
          {isAuthenticated && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setUserMenuOpen(false);
                }}
                className="relative p-2 rounded-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 text-on-surface-variant dark:text-slate-200 hover:text-primary dark:hover:text-primary hover:border-primary/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              >
                <Icon name="notifications" className="text-[20px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white shadow-sm ring-2 ring-surface-container-lowest dark:ring-slate-900">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-surface-container-lowest dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 rounded-2xl shadow-xl z-50 animate-fadeIn">
                  <div className="px-4 py-3 border-b border-outline-variant/40 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] text-primary font-bold hover:underline cursor-pointer">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-on-surface-variant dark:text-slate-400">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id} className={`p-3 border-b border-outline-variant/40 dark:border-slate-700 text-xs ${n.isRead ? 'opacity-60' : 'bg-surface-container-low dark:bg-slate-700/30'}`}>
                          <p className="font-bold text-on-surface dark:text-white">{n.title}</p>
                          <p className="text-on-surface-variant dark:text-slate-300 mt-0.5">{n.message}</p>
                          <p className="text-[9px] text-primary font-bold mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile Pill & Dropdown / Sign In Button */}
          {isAuthenticated ? (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 pl-1 bg-surface-container-low dark:bg-slate-800 hover:bg-surface-container dark:hover:bg-slate-700 border border-outline-variant/60 dark:border-slate-700 hover:border-primary/40 py-1 px-2.5 rounded-full cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-95 transition-all"
              >
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm ring-1 ring-primary/20 shrink-0">
                  <img
                    src={user?.avatar || "/logo.png"}
                    alt="User Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden sm:block text-left pr-1">
                  <p className="text-xs font-bold text-on-surface dark:text-white leading-tight">{user?.name || "Rajesh Kumar"}</p>
                  <p className="text-[10px] font-bold text-primary">{t(roleLabelKey(currentRole))}</p>
                </div>
                <Icon name="arrow_drop_down" className="text-outline text-[16px]" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-outline-variant/40 dark:border-slate-700">
                    <p className="text-xs font-bold text-on-surface dark:text-white">{user?.name}</p>
                    <p className="text-[11px] text-on-surface-variant dark:text-slate-300">{user?.email}</p>
                    <span className="mt-1 inline-block bg-primary-fixed text-on-primary-fixed text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {t('roleLabel')} {t(roleLabelKey(currentRole))}
                    </span>
                  </div>
                  {isPassenger(currentRole) && (
                    <Link
                      to="/passenger"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-on-surface dark:text-slate-200 hover:bg-surface-container-low dark:hover:bg-slate-700 transition-colors"
                    >
                      <Icon name="confirmation_number" className="text-[18px] text-primary" />
                      {t('myTickets')}
                    </Link>
                  )}
                  {isStaff(currentRole) && (
                    <Link
                      to={homeRouteForRole(currentRole)}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-on-surface dark:text-slate-200 hover:bg-surface-container-low dark:hover:bg-slate-700 transition-colors"
                    >
                      <Icon name="admin_panel_settings" className="text-[18px] text-primary" />
                      {t('consoleNavLabel', 'Console')}
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-bold text-error hover:bg-error-container/30 border-t border-outline-variant/40 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <Icon name="logout" className="text-[18px]" />
                    {t('signOut')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs px-5 py-2.5 rounded-full shadow-sm hover:shadow-md active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none transition-all whitespace-nowrap inline-flex items-center justify-center leading-none shrink-0 cursor-pointer"
            >
              {t('signIn')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
