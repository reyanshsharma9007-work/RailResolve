import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';

// Protected Route Guard
import ProtectedRoute from './ProtectedRoute';
import { ROLES } from '../constants/roles';

// Pages
import Home from '../pages/Home';
import Login from '../pages/Login';
import AdminDashboard from '../pages/AdminDashboard';
import OfficerConsole from '../pages/OfficerConsole';
import AuthorityConsole from '../pages/AuthorityConsole';
import Complaint from '../pages/Complaint';
import ReportComplaint from '../pages/ReportComplaint';
import TicketBooking from '../pages/TicketBooking';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Complaint detail. GET /api/complaints/:id needs a Bearer token and runs
          an object-level access check, so it can't be public. Every role may
          open it; the backend decides which records they actually see. */}
      <Route
        element={
          <ProtectedRoute>
            <PublicLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/track" element={<Complaint />} />
        <Route path="/complaint/:id" element={<Complaint />} />
      </Route>

      {/* Passenger. Journey and complaint creation are PASSENGER-only server side. */}
      <Route
        element={
          <ProtectedRoute allowedRoles={[ROLES.PASSENGER]}>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/passenger" element={<TicketBooking />} />
        <Route path="/tickets" element={<TicketBooking />} />
        <Route path="/report" element={<ReportComplaint />} />
      </Route>

      {/* Officer */}
      <Route
        element={
          <ProtectedRoute allowedRoles={[ROLES.OFFICER]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/officer" element={<OfficerConsole />} />
      </Route>

      {/* Senior Authority */}
      <Route
        element={
          <ProtectedRoute allowedRoles={[ROLES.SENIOR_AUTHORITY]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/authority" element={<AuthorityConsole />} />
      </Route>

      {/* Admin — administration only. */}
      <Route
        element={
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
