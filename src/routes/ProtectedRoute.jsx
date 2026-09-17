import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If passenger tries to access admin, redirect to passenger dashboard, and vice versa
    return <Navigate to={role === 'admin' ? '/admin' : '/passenger'} replace />;
  }

  return children;
};

export default ProtectedRoute;
