import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HardHat, Bell, Settings, LogOut, CheckCircle2, X, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { roleLabel, avatarColor } from '../../services/utils';
import Modal from '../common/Modal';

export default function SharedHeader({ user, onNotificationClick }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotif, setSelectedNotif] = useState(null);

  const menuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  async function loadNotifications() {
    if (!user) return;
    const notifs = await api.getNotifications(user.id);
    setNotifications(notifs || []);
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function handleLogout() {
    api.logout();
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'CH';

  const avatarBg = avatarColor(initials);

  async function handleNotificationClick(notif) {
    if (!notif.read) {
      await api.markNotificationRead(notif.id);
      loadNotifications();
    }
    setSelectedNotif(notif);
    setNotifOpen(false);
  }

  async function handleClearNotifications() {
    if (!notifications.length) return;
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      await api.clearNotifications(user?.id);
      setNotifications([]);
    }
  }

  async function handleDeleteSingleNotification(notifId) {
    await api.deleteNotification(notifId);
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  }

  const rolePath = user?.role ? `/${user.role.replace('_', '-')}` : '/login';

  return (
    <>
      <header className="navbar">
        <div className="nav-left">
          <Link to={`${rolePath}/dashboard`} className="nav-logo">
            <div className="logo-icon" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
              <HardHat size={26} />
            </div>
            <span className="logo-text">ConstructHub</span>
          </Link>
        </div>

        <div className="nav-center"></div>

        <div className="nav-right">
          {/* Notification Button & Panel */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="notif-btn"
              onClick={() => setNotifOpen(!notifOpen)}
              title="Notifications"
            >
              <Bell size={19} color="var(--text-muted)" />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>

            {notifOpen && (
              <div className="notif-panel" style={{ display: 'block' }}>
                <div className="notif-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>Notifications</strong>
                    {unreadCount > 0 && (
                      <span className="badge badge-red">{unreadCount} New</span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearNotifications}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Clear all notifications"
                    >
                      <Trash2 size={13} /> Clear All
                    </button>
                  )}
                </div>
                {notifications.length > 0 ? (
                  <>
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`notif-item ${n.read ? '' : 'notif-unread'}`}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '8px'
                          }}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div style={{ flex: 1 }}>
                            <strong>{n.title}</strong>
                            <p>{n.body || n.message}</p>
                            <small>{n.time || n.date}</small>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSingleNotification(n.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              opacity: 0.5
                            }}
                            title="Delete notification"
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="notif-empty">No notifications</p>
                )}
              </div>
            )}
          </div>

          {/* User Menu & Dropdown */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <div
              className="user-menu"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div
                className="avatar"
                style={{
                  width: 36,
                  height: 36,
                  background: avatarBg,
                  fontSize: 14,
                }}
              >
                {initials}
              </div>
              <div className="user-info">
                <span className="user-name">{user?.name || 'User'}</span>
                <span className="user-role">{roleLabel(user?.role)}</span>
              </div>
            </div>

            {dropdownOpen && (
              <div className="user-dropdown" style={{ display: 'block' }}>
                <div className="dropdown-header">My Account</div>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate(`${rolePath}/settings`);
                  }}
                >
                  <Settings size={15} /> Settings
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="logout-link"
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notification Detail Modal */}
      <Modal
        isOpen={!!selectedNotif}
        onClose={() => setSelectedNotif(null)}
        title={selectedNotif?.title || 'Notification Details'}
        subtitle={`Sent: ${selectedNotif?.time || selectedNotif?.date || ''}`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              onClick={() => {
                if (selectedNotif) {
                  handleDeleteSingleNotification(selectedNotif.id);
                  setSelectedNotif(null);
                }
              }}
            >
              <Trash2 size={13} style={{ marginRight: 4 }} /> Delete Notification
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setSelectedNotif(null)}
            >
              Close
            </button>
          </div>
        }
      >
        <div style={{ padding: '10px 0', fontSize: '14px', lineHeight: 1.6 }}>
          {selectedNotif?.title === 'New Contact Inquiry' && selectedNotif?.details ? (
            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Contact Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '3px' }}>Full Name</div>
                    <strong>{selectedNotif.details.name || 'Inquiry Contact'}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '3px' }}>Email Address</div>
                    <strong>{selectedNotif.details.email || 'contact@client.com'}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '3px' }}>Phone Number</div>
                    <strong>{selectedNotif.details.phone || '+91 98765 43210'}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, marginBottom: '3px' }}>Company Name</div>
                    <strong>{selectedNotif.details.company || 'Enterprise Prospect'}</strong>
                  </div>
                </div>
              </div>
              <div style={{ background: 'var(--bg)', padding: '14px', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Message
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text)' }}>
                  {selectedNotif.details.message || selectedNotif.body || 'No message provided.'}
                </div>
              </div>
            </div>
          ) : (
            <p>{selectedNotif?.body || selectedNotif?.message}</p>
          )}
        </div>
      </Modal>
    </>
  );
}
