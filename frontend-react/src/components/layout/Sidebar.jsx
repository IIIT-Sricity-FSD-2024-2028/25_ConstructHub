import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export default function Sidebar({ items = [], onLogout }) {
  const location = useLocation();

  function isItemActive(item) {
    if (item.matchQuery) {
      return location.search.includes(item.matchQuery);
    }
    if (item.isExact) {
      return location.pathname === item.path && !location.search;
    }
    if (item.matchPrefix) {
      return location.pathname.startsWith(item.matchPrefix);
    }
    return location.pathname === item.path;
  }

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {items.map((item, index) => {
          if (item.isDivider) {
            return <div key={`divider-${index}`} className="sidebar-divider" />;
          }

          const IconComponent = item.icon;
          const active = isItemActive(item);

          return (
            <Link
              key={item.path || index}
              to={item.path}
              className={active ? 'active' : ''}
            >
              {IconComponent && <IconComponent size={18} />}
              <span>{item.label}</span>
            </Link>
          );
        })}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            style={{ color: 'var(--red)', marginTop: 'auto' }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        )}
      </nav>
    </aside>
  );
}
