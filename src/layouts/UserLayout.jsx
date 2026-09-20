import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const UserLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-slate-950 font-sans text-on-surface dark:text-slate-100 antialiased transition-colors">
      <Navbar />
      <main className="w-full pt-20 flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default UserLayout;
