import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user: authUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Check context user first, with fallback to synchronous storage
  const user = authUser || api.getCurrentUser();
  const token = api.getToken();

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required, allow matching role or superuser
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role) &&
    user.role !== 'superuser'
  ) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
