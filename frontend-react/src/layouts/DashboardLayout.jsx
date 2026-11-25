import { useEffect, useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { navigationConfig, filterClientNav } from '../routes/navigationConfig';
import SharedHeader from '../components/layout/SharedHeader';
import Sidebar from '../components/layout/Sidebar';

export default function DashboardLayout() {
  const { user: authUser, setUser, logout } = useAuth();
  const user = authUser || api.getCurrentUser();
  const location = useLocation();
  // The mobile menu belongs to the page it was opened on, so it closes by itself when the route changes.
  const routeKey = `${location.pathname}${location.search}`;
  const [navOpenAt, setNavOpenAt] = useState(null);
  const mobileNavOpen = navOpenAt === routeKey;
  const setMobileNavOpen = (next) => setNavOpenAt((prevKey) => {
    const wasOpen = prevKey === routeKey;
    const open = typeof next === 'function' ? next(wasOpen) : next;
    return open ? routeKey : null;
  });

  // Clients: null while loading, then how many projects they own (drives the two-stage portal).
  const [projectCount, setProjectCount] = useState(null);
  const isClient = user?.role === 'client';

  const userId = user?.id;
  const refreshProjects = useCallback(async () => {
    if (!isClient || !userId) return;
    const all = await api.getProjects();
    setProjectCount((all || []).filter((p) => p.clientId === userId).length);
  }, [isClient, userId]);

  useEffect(() => {
    if (!isClient) return;
    let live = true;
    api.getProjects().then((all) => {
      if (live) setProjectCount((all || []).filter((p) => p.clientId === user.id).length);
    });
    return () => { live = false; };
  }, [isClient, user?.id, location.pathname]);

  const baseNav = user?.role ? (navigationConfig[user.role] || []) : [];
  const navItems = isClient ? filterClientNav(baseNav, projectCount ?? 0) : baseNav;

  return (
    <div className="app-layout">
      <SharedHeader
        user={user}
        onLogout={logout}
        onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
      />
      <div className="app-body">
        <Sidebar
          items={navItems}
          onLogout={logout}
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <main className="main-content">
          <Outlet context={{ user, setUser, projectCount: isClient ? projectCount : undefined, refreshProjects }} />
        </main>
      </div>
    </div>
  );
}
