import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';

// Protected Route Guard
import ProtectedRoute from './ProtectedRoute';

// Pages
import Home from '../pages/Home';
import Login from '../pages/Login';
import AdminDashboard from '../pages/AdminDashboard';
import Complaint from '../pages/Complaint';
import ReportComplaint from '../pages/ReportComplaint';
import TicketBooking from '../pages/TicketBooking';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Pages wrapped in PublicLayout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/track" element={<Complaint />} />
      </Route>

      {/* Passenger Pages wrapped in UserLayout */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['passenger', 'admin']}>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/passenger" element={<TicketBooking />} />
        <Route path="/report" element={<ReportComplaint />} />
      </Route>

      {/* Admin Console wrapped in AdminLayout */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      {/* Fallback wildcard redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
