import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import useAuth from '../hooks/useAuth';

const AdminLayout = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-slate-950 font-sans text-on-surface dark:text-slate-100 antialiased transition-colors">
      <Navbar />
      <div className="pt-20 bg-surface-container-low dark:bg-slate-900 border-b border-outline-variant/60 dark:border-slate-800 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 md:px-margin py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-primary text-on-primary font-bold shadow-xs">
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-on-surface dark:text-white tracking-tight leading-tight">
                RailResolve Enterprise Admin Console
              </h2>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 font-medium">
                Live Grievance Operations &amp; Telemetry Matrix
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live Grid Feed Active
            </div>
            <div className="px-3 py-1 rounded-full bg-surface-container-lowest dark:bg-slate-800 text-on-surface dark:text-white border border-outline-variant/60 dark:border-slate-700">
              Admin: <span className="text-primary">{user?.name || 'System Admin'}</span>
            </div>
          </div>
        </div>
      </div>
      <main className="w-full flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default AdminLayout;
