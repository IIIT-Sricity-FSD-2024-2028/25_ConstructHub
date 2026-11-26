import { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch, useAppSelector, useLoad } from '../store/hooks';
import { fetchProjects, selectProjectsOfClient, selectProjectsStatus } from '../features/projects/projectsSlice';
import { navigationConfig, filterClientNav } from '../routes/navigationConfig';
import SharedHeader from '../components/layout/SharedHeader';
import Sidebar from '../components/layout/Sidebar';

export default function DashboardLayout() {
  const { user, setUser, logout } = useAuth();
  const dispatch = useAppDispatch();
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

  // Clients: how many projects they own drives the two-stage portal (null until the first load finishes).
  const isClient = user?.role === 'client';
  useLoad(isClient ? [fetchProjects] : [], [isClient, user?.id, location.pathname]);
  const clientProjects = useAppSelector((state) => selectProjectsOfClient(state, user?.id));
  const projectsStatus = useAppSelector(selectProjectsStatus);
  const projectCount = projectsStatus === 'succeeded' || clientProjects.length > 0 ? clientProjects.length : null;
  const refreshProjects = useCallback(() => dispatch(fetchProjects()), [dispatch]);

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
