import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchNotifications, markNotificationRead, deleteNotification, clearNotifications,
  selectAllNotifications, selectUnreadCount,
} from '../../features/notifications/notificationsSlice';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Settings,
  LogOut,
  X,
  Trash2,
  Menu,
  CheckCheck,
  Receipt,
  ClipboardCheck,
  Package,
  MessageSquare,
  Sparkles,
  Inbox
} from 'lucide-react';
import ConstructHubLogo from '../common/ConstructHubLogo';
import { roleLabel, avatarColor } from '../../services/utils';
import Modal from '../common/Modal';

function getNotifVisual(n) {
  const hay = `${n?.type || ''} ${n?.title || ''}`.toLowerCase();
  if (hay.includes('bill') || hay.includes('pay') || hay.includes('budget') || hay.includes('expense') || hay.includes('top-up')) {
    return { Icon: Receipt, bg: '#fff7ed', color: '#ea580c' };
  }
  if (hay.includes('milestone') || hay.includes('task') || hay.includes('report') || hay.includes('project') || hay.includes('contract')) {
    return { Icon: ClipboardCheck, bg: '#ecfdf5', color: '#059669' };
  }
  if (hay.includes('material') || hay.includes('purchase') || hay.includes('stock') || hay.includes('order') || hay.includes('quote') || hay.includes('quotation')) {
    return { Icon: Package, bg: '#eff6ff', color: '#2563eb' };
  }
  if (hay.includes('message') || hay.includes('chat') || hay.includes('feedback')) {
    return { Icon: MessageSquare, bg: '#f5f3ff', color: '#7c3aed' };
  }
  return { Icon: Sparkles, bg: '#f1f5f9', color: '#475569' };
}

export default function SharedHeader({ user, onLogout, onToggleMobileNav }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all');
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectAllNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const [selectedNotif, setSelectedNotif] = useState(null);

  const menuRef = useRef(null);
  const notifRef = useRef(null);

  const userId = user?.id;
  const loadNotifications = useCallback(() => {
    if (userId) dispatch(fetchNotifications());
  }, [userId, dispatch]);

  // Initial load + lightweight 20s background poll (pauses when tab is hidden)
  useEffect(() => {
    if (!userId) return;
    const first = setTimeout(() => { void loadNotifications(); }, 0);
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadNotifications();
      }
    }, 20000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [userId, loadNotifications]);

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
    if (onLogout) onLogout();
  }

  function handleToggleNotif() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) void loadNotifications();
  }

  const displayedNotifs = notifFilter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'CH';

  const avatarBg = avatarColor(initials);

  async function handleNotificationClick(notif) {
    if (!notif.read && notif.id) dispatch(markNotificationRead(notif.id)); // optimistic in the slice
    setSelectedNotif(notif);
    setNotifOpen(false);
  }

  async function handleMarkAllRead() {
    const unread = notifications.filter((n) => !n.read && n.id);
    await Promise.all(unread.map((n) => dispatch(markNotificationRead(n.id))));
  }

  async function handleClearNotifications() {
    if (!notifications.length) return;
    await dispatch(clearNotifications());
    loadNotifications();
  }

  async function handleDeleteSingleNotification(notifId) {
    if (!notifId) return;
    await dispatch(deleteNotification(notifId));
  }

  const rolePath = user?.role ? `/${user.role.replaceAll('_', '-')}` : '/login';

  return (
    <>
      <header className="navbar">
        <div className="nav-left">
          {onToggleMobileNav && (
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={onToggleMobileNav}
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>
          )}
          <Link to={`${rolePath}/dashboard`} className="nav-logo">
            <ConstructHubLogo size={30} textSize={17} />
          </Link>
        </div>

        <div className="nav-center"></div>

        <div className="nav-right">
          {/* Notification Button & Redesigned Popover */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="notif-btn"
              onClick={handleToggleNotif}
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={19} color={notifOpen ? 'var(--primary)' : 'var(--text-muted)'} />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>

            {notifOpen && (
              <div
                className="notif-panel"
                style={{
                  display: 'block',
                  width: 390,
                  maxWidth: 'calc(100vw - 24px)',
                  borderRadius: 16,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 20px 48px rgba(15, 23, 42, 0.14)',
                  overflow: 'hidden',
                  background: '#ffffff'
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: '14px 16px 10px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    background: '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Notifications</strong>
                      {unreadCount > 0 && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: '#fff7ed',
                            color: '#ea580c',
                            border: '1px solid #fed7aa'
                          }}
                        >
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#475569',
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '4px 7px',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title="Mark all as read"
                        >
                          <CheckCheck size={13} /> Mark read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearNotifications}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ea580c',
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '4px 7px',
                            borderRadius: 6,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                          title="Clear notifications"
                        >
                          <Trash2 size={12} /> Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* All / Unread Segmented Pill */}
                  <div
                    style={{
                      display: 'inline-flex',
                      background: '#f1f5f9',
                      borderRadius: 9,
                      padding: 3,
                      alignSelf: 'flex-start',
                      gap: 2
                    }}
                  >
                    {['all', 'unread'].map((tab) => {
                      const active = notifFilter === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setNotifFilter(tab)}
                          style={{
                            border: 'none',
                            borderRadius: 7,
                            padding: '4px 11px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: active ? '#ffffff' : 'transparent',
                            color: active ? '#0f172a' : '#64748b',
                            boxShadow: active ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {tab === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* List */}
                {displayedNotifs.length > 0 ? (
                  <div style={{ maxHeight: 370, overflowY: 'auto' }}>
                    {displayedNotifs.map((n, idx) => {
                      const { Icon, bg, color } = getNotifVisual(n);
                      return (
                        <div
                          key={n.id || idx}
                          onClick={() => handleNotificationClick(n)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 11,
                            padding: '12px 16px',
                            borderBottom: '1px solid #f1f5f9',
                            background: n.read ? '#ffffff' : '#fffaf5',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = n.read ? '#f8fafc' : '#fff7ed'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? '#ffffff' : '#fffaf5'; }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 10,
                              background: bg,
                              color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 1
                            }}
                          >
                            <Icon size={16} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              {!n.read && (
                                <span
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background: '#f97316',
                                    flexShrink: 0
                                  }}
                                />
                              )}
                              <strong
                                style={{
                                  fontSize: 13,
                                  fontWeight: n.read ? 600 : 700,
                                  color: '#0f172a',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {n.title}
                              </strong>
                            </div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12.5,
                                lineHeight: 1.45,
                                color: '#475569',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {n.body || n.message}
                            </p>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 500 }}>
                              {n.time || n.date || 'Just now'}
                            </div>
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
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: 4,
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                              flexShrink: 0
                            }}
                            title="Dismiss"
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none'; }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '34px 20px', textAlign: 'center', color: '#64748b' }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        marginBottom: 10
                      }}
                    >
                      <Inbox size={20} />
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>
                      {notifFilter === 'unread' ? 'All caught up' : 'No notifications yet'}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
                      {notifFilter === 'unread'
                        ? 'You have no unread updates right now.'
                        : 'Updates on bills, milestones, and messages will appear here.'}
                    </div>
                  </div>
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
        subtitle={`Sent: ${selectedNotif?.time || selectedNotif?.date || 'Just now'}`}
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
            <p style={{ margin: 0, color: '#334155' }}>{selectedNotif?.body || selectedNotif?.message}</p>
          )}
        </div>
      </Modal>
    </>
  );
}
