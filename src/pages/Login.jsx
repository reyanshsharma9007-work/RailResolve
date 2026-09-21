import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { homeRouteForRole, ROLES } from '../constants/roles';
import heroTrainImg from '../assets/hero-train.jpg';

import Icon from '../components/common/Icon';
const Login = () => {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  // Presentation only. The backend's authenticated role decides where the
  // user actually lands and what they can do — selecting Admin here grants
  // nothing.
  const [selectedRole, setSelectedRole] = useState(ROLES.PASSENGER);

  // Sign In Form States
  const [signInIdentifier, setSignInIdentifier] = useState('rajesh.kumar@example.com');
  const [signInPassword, setSignInPassword] = useState('123456');

  // Create Account Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pnrOrAdminKey, setPnrOrAdminKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { login, register, toggleLanguage, language, t } = useAuth();
  // Non-passenger accounts are provisioned by an administrator, never self-served.
  const isStaffSelection = selectedRole !== ROLES.PASSENGER;
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      const loggedInUser = await login({
        email: signInIdentifier,
        password: signInPassword
      });

      // The server decides the role — never the role pill on this form.
      navigate(homeRouteForRole(loggedInUser.role));
    } catch (error) {
      console.error('Login failed', error);
      alert(error.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    // Only passengers can register via the frontend.
    if (isStaffSelection) {
      alert(t('staffRegistrationBlocked', 'Staff accounts are created by an administrator, not through the public portal.'));
      return;
    }

    try {
      await register({
        name: fullName,
        email: email,
        phone: phone,
        pnr: pnrOrAdminKey,
        password: newPassword
      });

      navigate('/passenger');
    } catch (error) {
      console.error('Registration failed', error);
      alert(error.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      {/* Main Dual Split Card Portal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden shadow-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/60 dark:border-slate-400 hover:border-outline-variant dark:hover:border-slate-700 transition-all">
        
        {/* LEFT COLUMN: Hero Banner with Cinematic Motion */}
        <div className="lg:col-span-5 bg-on-surface text-surface p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden group">
          {/* Layered Motion Container */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Background Parallax & Scenery Blur Layer */}
            <img
              src={heroTrainImg}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-center scale-105 blur-[2px] opacity-35 cinematic-bg-drift"
            />
            {/* Main Train Image with Micro-Rumble & Track Tracking */}
            <img
              src={heroTrainImg}
              alt="Vande Bharat Express Locomotive"
              className="absolute inset-0 w-full h-full object-cover object-center cinematic-train-motion"
            />
            {/* Cinematic Speed Light Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent cinematic-speed-shimmer"></div>
            {/* Dark Vignette Overlay for Text Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/30 z-10"></div>
          </div>

          {/* Static Hero Heading & Description */}
          <div className="relative z-20 flex flex-col justify-start h-full min-h-[460px]">
            <div className="pt-2">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md">
                {t('nextGenTitle')}<br />
                <span className="text-orange-400">{t('nextGenHighlight')}</span>
              </h1>
              <p className="text-slate-300 text-sm mt-3 max-w-xs leading-relaxed font-medium">
                {t('nextGenSub')}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Auth Hub */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-12 flex flex-col justify-between bg-surface-container-lowest dark:bg-slate-900">
          <div>
            {/* Top Bar: Auth Mode Switcher (Sign In vs Create Account) & Language */}
            <div className="flex items-center justify-between mb-6">
              <div className="inline-flex p-1 rounded-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 shadow-xs">
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className={`px-6 py-2 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-95 ${
                    authMode === 'signin'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface dark:hover:text-white hover:bg-surface-container/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {t('signIn')}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className={`px-6 py-2 rounded-full text-xs font-extrabold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-95 ${
                    authMode === 'signup'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface dark:hover:text-white hover:bg-surface-container/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {t('createAccount')}
                </button>
              </div>

              {/* Language Switcher */}
              <div className="inline-flex items-center p-1 rounded-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => toggleLanguage('en')}
                  className={`px-2.5 py-1 rounded-full transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-95 ${
                    language === 'en'
                      ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary font-bold shadow-xs'
                      : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface dark:hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => toggleLanguage('hi')}
                  className={`px-2.5 py-1 rounded-full transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-95 ${
                    language === 'hi'
                      ? 'bg-surface-container-lowest dark:bg-slate-700 text-primary font-bold shadow-xs'
                      : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface dark:hover:text-white'
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            </div>

            {/* Role selector — four roles, matching the backend ROLES enum.
                This is a presentation hint only: the server's authenticated
                role decides the destination and the permissions. */}
            <div className="mb-6 p-1.5 rounded-2xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { value: ROLES.PASSENGER, icon: 'person', labelKey: 'rolePassenger', fallback: 'Passenger (Citizen)' },
                { value: ROLES.OFFICER, icon: 'engineering', labelKey: 'roleOfficer', fallback: 'Officer' },
                { value: ROLES.SENIOR_AUTHORITY, icon: 'gavel', labelKey: 'roleSeniorAuthority', fallback: 'Senior Authority' },
                { value: ROLES.ADMIN, icon: 'admin_panel_settings', labelKey: 'roleAdmin', fallback: 'Admin' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedRole(option.value)}
                  className={`py-2.5 px-2 rounded-xl font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-[0.98] ${
                    selectedRole === option.value
                      ? 'bg-primary text-on-primary shadow-md'
                      : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface dark:hover:text-white hover:bg-surface-container/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Icon name={option.icon} className="text-[16px]" />
                  <span className="truncate">{t(option.labelKey, option.fallback)}</span>
                </button>
              ))}
            </div>

            {/* Form Headline */}
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-on-surface dark:text-white tracking-tight">
                {authMode === 'signin'
                  ? isStaffSelection
                    ? t('adminLoginTitle')
                    : t('passengerLoginTitle')
                  : isStaffSelection
                  ? t('adminRegisterTitle')
                  : t('passengerRegisterTitle')}
              </h2>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1">
                {authMode === 'signin'
                  ? isStaffSelection
                    ? t('adminLoginSub')
                    : t('passengerLoginSub')
                  : isStaffSelection
                  ? t('adminRegisterSub')
                  : t('passengerRegisterSub')}
              </p>
            </div>

            {/* MODE 1: SIGN IN FORM */}
            {authMode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">
                    {isStaffSelection ? t('adminIdentifierLabel') : t('signInIdentifierLabel')}
                  </label>
                  <div className="relative flex items-center bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-3.5 py-3 hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <Icon name={isStaffSelection ? 'badge' : 'person'} className="text-outline dark:text-slate-400 text-[20px] mr-2" />
                    <input
                      type="text"
                      required
                      value={signInIdentifier}
                      onChange={(e) => setSignInIdentifier(e.target.value)}
                      placeholder={isStaffSelection ? 'admin@railresolve.gov.in' : 'rajesh.kumar@example.com'}
                      className="w-full bg-transparent border-none outline-none text-xs font-bold text-on-surface dark:text-white placeholder:text-outline"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">
                    {t('password')}
                  </label>
                  <div className="relative flex items-center bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-3.5 py-3 hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <Icon name="lock" className="text-outline dark:text-slate-400 text-[20px] mr-2" />
                    <input
                      type="password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent border-none outline-none text-xs font-bold text-on-surface dark:text-white placeholder:text-outline"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-container text-on-primary font-extrabold text-sm py-3.5 rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  <span>
                    {isStaffSelection ? t('authenticateAdmin') : t('verifyAccess')} &rarr;
                  </span>
                </button>
              </form>
            )}

            {/* MODE 2: CREATE ACCOUNT FORM */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">
                    {t('fullName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">
                      {t('emailAddress')}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">
                      {t('mobileNumber')}
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">
                    {isStaffSelection ? t('adminKey') : t('pnrNumber')}
                  </label>
                  <input
                    type="text"
                    required={isStaffSelection}
                    value={pnrOrAdminKey}
                    onChange={(e) => setPnrOrAdminKey(e.target.value)}
                    placeholder={isStaffSelection ? 'e.g. ADM-AUTH-9912' : 'e.g. 2489105839 (Optional)'}
                    className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">
                      {t('password')}
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1">
                      {t('confirmPassword')}
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2.5 text-xs font-bold text-on-surface dark:text-white focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-container text-on-primary font-extrabold text-sm py-3.5 rounded-2xl shadow-md hover:shadow-lg active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  <span>
                    {isStaffSelection ? t('registerAdmin') : t('registerPassenger')} &rarr;
                  </span>
                </button>
              </form>
            )}
          </div>

          <div className="pt-6 border-t border-outline-variant/40 dark:border-slate-800 text-center">
            <p className="text-[11px] text-on-surface-variant dark:text-slate-400 font-medium">
              {t('termsNotice')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
