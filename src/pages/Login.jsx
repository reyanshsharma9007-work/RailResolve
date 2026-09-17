import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const Login = () => {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [selectedRole, setSelectedRole] = useState('passenger'); // 'passenger' | 'admin'

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

  const { login, toggleLanguage, language, t } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = (e) => {
    e.preventDefault();
    login(selectedRole, {
      name: selectedRole === 'admin' ? 'System Admin' : 'Rajesh Kumar',
      email: selectedRole === 'admin' ? 'admin@railresolve.gov.in' : signInIdentifier,
      phone: '+91 98765 43210',
      pnr: selectedRole === 'passenger' ? '2489-1058-39' : 'ADMIN-KEY-991',
      tier: selectedRole === 'admin' ? 'System Administrator' : 'Verified Passenger',
      avatar: selectedRole === 'admin'
        ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuByXgmf2t_ZjweU5On_-g0VjyP_66LFe4L-YDf5OPTOc-24PcROX3ZGxMk1JDmkIFfP65hZ8QTOEMLSbbNFSG1A3rIoNezFM-lSpkcrtAf-SBIILWBxwCCQ41cA5S3Q6P0pOZxrBFKqnABzv6TUpjyc6xP1Z6LPYqNIriAoWLWfoHBluyetuMnqF-kemegnvNFnJIq-30ZeCP1Q4J3ZJXQo2psVy9c3KmSTwgPnSF7Xvt6IjBZyiiwmQBnN6nbxOQPvwQ'
        : 'https://lh3.googleusercontent.com/aida-public/AB6AXuBikO5Q8O6sJKFRh2TyU_yIecJEbNSt2V5Bhvpfk-LMP2L1BwRgK-t0Tx2j2c8JH4A9rcKSQsKpZS37oFtWFqhFBWCqrJBxHbe_An59ILWQgpEKaTt_yBWGjAPnyLRhHhwCSXRBqTa0tJBLlQ5sJlhWxzZIXIO4WDhS9m2oTjVowIB1kvLZFSHTzi6I1tvbvhX6rcD5EHMY3cMgQeLROo1bXgeyN_5BdsqNByeMAPzXdvRkagVO38Wxjm2-Vj_cdKetmA'
    });

    if (selectedRole === 'admin') {
      navigate('/admin');
    } else {
      navigate('/passenger');
    }
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    login(selectedRole, {
      name: fullName || (selectedRole === 'admin' ? 'System Admin' : 'New Passenger'),
      email: email || (selectedRole === 'admin' ? 'admin@railresolve.gov.in' : 'passenger@example.com'),
      phone: phone || '+91 98765 43210',
      pnr: pnrOrAdminKey || '2489-1058-39',
      tier: selectedRole === 'admin' ? 'System Administrator' : 'Verified Passenger',
      avatar: selectedRole === 'admin'
        ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuByXgmf2t_ZjweU5On_-g0VjyP_66LFe4L-YDf5OPTOc-24PcROX3ZGxMk1JDmkIFfP65hZ8QTOEMLSbbNFSG1A3rIoNezFM-lSpkcrtAf-SBIILWBxwCCQ41cA5S3Q6P0pOZxrBFKqnABzv6TUpjyc6xP1Z6LPYqNIriAoWLWfoHBluyetuMnqF-kemegnvNFnJIq-30ZeCP1Q4J3ZJXQo2psVy9c3KmSTwgPnSF7Xvt6IjBZyiiwmQBnN6nbxOQPvwQ'
        : 'https://lh3.googleusercontent.com/aida-public/AB6AXuBikO5Q8O6sJKFRh2TyU_yIecJEbNSt2V5Bhvpfk-LMP2L1BwRgK-t0Tx2j2c8JH4A9rcKSQsKpZS37oFtWFqhFBWCqrJBxHbe_An59ILWQgpEKaTt_yBWGjAPnyLRhHhwCSXRBqTa0tJBLlQ5sJlhWxzZIXIO4WDhS9m2oTjVowIB1kvLZFSHTzi6I1tvbvhX6rcD5EHMY3cMgQeLROo1bXgeyN_5BdsqNByeMAPzXdvRkagVO38Wxjm2-Vj_cdKetmA'
    });

    if (selectedRole === 'admin') {
      navigate('/admin');
    } else {
      navigate('/passenger');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      {/* Main Dual Split Card Portal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden shadow-2xl bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/60 dark:border-slate-800 hover:border-outline-variant dark:hover:border-slate-700 transition-all">
        
        {/* LEFT COLUMN: Hero Banner */}
        <div className="lg:col-span-5 bg-on-surface text-surface p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBuzdqVeaFVfsx8Q2opLsOpsmstv2AkHk6hnh5C2s8G6rV5PCHQlsGhwfwg3KEJQ4xVEqMBr12zxa-QO0gsnN5pCccqoJAuZt_QqlgBbu4Z3XdyR6T95kiajhMIoTU8RsW6x_nSrQDmMH5e163WK9VBZQsaEUPLhEyEZu-4uTrkafh2RAyKPLDlqpugNedLp-PRf-CseR7sAA-aBPDBDQUEuc5ah9ldD0b71RydyDB8zQNDonnsMp1"
            alt="RailResolve Express Locomotive"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/30"></div>
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[460px]">
            <div className="pt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-orange-500/30 text-orange-400 text-xs font-mono font-bold mb-6">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                <span>RailResolve Portal</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight drop-shadow-md">
                {t('nextGenTitle')}<br />
                <span className="text-orange-400">{t('nextGenHighlight')}</span>
              </h1>
              <p className="text-slate-300 text-sm mt-3 max-w-xs leading-relaxed font-medium">
                {t('nextGenSub')}
              </p>
            </div>
            <div className="pt-8">
              <div className="backdrop-blur-md bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between text-xs text-slate-300 font-mono shadow-xl hover:border-orange-500/40 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-white font-bold">{t('gridTelemetry')}</span>
                </div>
                <span className="text-orange-400 font-semibold">{t('avgSla')}</span>
              </div>
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

            {/* ONLY TWO ROLES Selector Pill */}
            <div className="mb-6 p-1.5 rounded-2xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/60 dark:border-slate-700 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('passenger')}
                className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-[0.98] ${
                  selectedRole === 'passenger'
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface dark:hover:text-white hover:bg-surface-container/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                <span>{t('passengerCitizen')}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none active:scale-[0.98] ${
                  selectedRole === 'admin'
                    ? 'bg-primary text-on-primary shadow-md'
                    : 'text-on-surface-variant dark:text-slate-300 hover:text-on-surface dark:hover:text-white hover:bg-surface-container/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                <span>{t('admin')}</span>
              </button>
            </div>

            {/* Form Headline */}
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-on-surface dark:text-white tracking-tight">
                {authMode === 'signin'
                  ? selectedRole === 'admin'
                    ? t('adminLoginTitle')
                    : t('passengerLoginTitle')
                  : selectedRole === 'admin'
                  ? t('adminRegisterTitle')
                  : t('passengerRegisterTitle')}
              </h2>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1">
                {authMode === 'signin'
                  ? selectedRole === 'admin'
                    ? t('adminLoginSub')
                    : t('passengerLoginSub')
                  : selectedRole === 'admin'
                  ? t('adminRegisterSub')
                  : t('passengerRegisterSub')}
              </p>
            </div>

            {/* MODE 1: SIGN IN FORM */}
            {authMode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">
                    {selectedRole === 'admin' ? t('adminIdentifierLabel') : t('signInIdentifierLabel')}
                  </label>
                  <div className="relative flex items-center bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-3.5 py-3 hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <span className="material-symbols-outlined text-outline dark:text-slate-400 text-[20px] mr-2">
                      {selectedRole === 'admin' ? 'badge' : 'person'}
                    </span>
                    <input
                      type="text"
                      required
                      value={signInIdentifier}
                      onChange={(e) => setSignInIdentifier(e.target.value)}
                      placeholder={selectedRole === 'admin' ? 'admin@railresolve.gov.in' : 'rajesh.kumar@example.com'}
                      className="w-full bg-transparent border-none outline-none text-xs font-bold text-on-surface dark:text-white placeholder:text-outline"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface dark:text-slate-200 block mb-1.5">
                    {t('password')}
                  </label>
                  <div className="relative flex items-center bg-surface-container-low dark:bg-slate-800 border border-outline-variant/80 dark:border-slate-700 rounded-2xl px-3.5 py-3 hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <span className="material-symbols-outlined text-outline dark:text-slate-400 text-[20px] mr-2">lock</span>
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
                    {selectedRole === 'admin' ? t('authenticateAdmin') : t('verifyAccess')} &rarr;
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
                    {selectedRole === 'admin' ? t('adminKey') : t('pnrNumber')}
                  </label>
                  <input
                    type="text"
                    required={selectedRole === 'admin'}
                    value={pnrOrAdminKey}
                    onChange={(e) => setPnrOrAdminKey(e.target.value)}
                    placeholder={selectedRole === 'admin' ? 'e.g. ADM-AUTH-9912' : 'e.g. 2489105839 (Optional)'}
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
                    {selectedRole === 'admin' ? t('registerAdmin') : t('registerPassenger')} &rarr;
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
