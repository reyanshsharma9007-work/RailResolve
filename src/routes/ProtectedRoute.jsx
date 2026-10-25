import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import AccessRestricted from '../pages/AccessRestricted';
import { normalizeRole, homeRouteForRole } from '../constants/roles';

/**
 * Frontend route gate. This is a usability layer only — the Express backend
 * remains the real authorization boundary (auth.middleware, rbac.middleware and
 * ownership.middleware all re-check every request).
 *
 * An unauthenticated visitor is sent to /login. An authenticated user who lacks
 * the role is shown Access Restricted rather than being bounced, which is what
 * previously caused redirect loops between two routes neither role could enter.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = normalizeRole(role);

  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    return <AccessRestricted role={currentRole} homeRoute={homeRouteForRole(currentRole)} />;
  }

  return children;
};

export default ProtectedRoute;
