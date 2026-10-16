import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { navigationConfig } from '../routes/navigationConfig';
import SharedHeader from '../components/layout/SharedHeader';
import Sidebar from '../components/layout/Sidebar';

export default function DashboardLayout() {
  const { user: authUser, setUser, logout } = useAuth();
  const user = authUser || api.getCurrentUser();

  const navItems = user?.role ? (navigationConfig[user.role] || []) : [];

  return (
    <div className="app-layout">
      <SharedHeader user={user} onLogout={logout} />
      <div className="app-body">
        <Sidebar items={navItems} onLogout={logout} />
        <main className="main-content">
          <Outlet context={{ user, setUser }} />
        </main>
      </div>
    </div>
  );
}
