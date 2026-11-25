import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Search,
  CheckCheck,
  Smile,
  Phone,
  Mail,
  ArrowLeft,
  X,
  MessageSquare,
  Shield,
  Info,
  Building2
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { avatarColor, roleLabel } from '../../services/utils';
import '../../styles/whatsapp-chat.css';

const QUICK_EMOJIS = ['👍', '✅', '🏗️', '👏', '👌', '⚠️', '🙏', '😊', '🔥'];

function parseMessageTimestamp(m) {
  if (!m) return 0;
  if (m.timestamp) {
    const t = new Date(m.timestamp).getTime();
    if (!isNaN(t)) return t;
    const parsed = Date.parse(m.timestamp.replace(/-/g, '/'));
    if (!isNaN(parsed)) return parsed;
  }
  if (m.date) {
    const timeStr = m.time || '00:00';
    const combined = `${m.date} ${timeStr}`;
    const t = new Date(combined).getTime();
    if (!isNaN(t)) return t;
    const parsed = Date.parse(combined.replace(/-/g, '/'));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

/**
 * `contactIds` (optional) limits who can be chatted with, e.g. a project workspace passes only the people
 * on that project. Without it the whole company directory is offered.
 */
export default function MessagesChat({ user, contactIds }) {
  const toast = useToast();
  const contactKey = contactIds ? contactIds.join(',') : '';
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [inputText, setInputText] = useState('');
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [inChatSearch, setInChatSearch] = useState('');
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const userId = user?.id;
  const userCompanyId = user?.companyId;

  const refreshMessages = useCallback(async () => {
    if (!userId) return;
    const allMsgs = await api.getMessages();
    setMessages(Array.isArray(allMsgs) ? allMsgs : []);
  }, [userId]);

  const loadInitialData = useCallback(async () => {
    if (!userId) return;
    const [allUsers, allMsgs, allProjects] = await Promise.all([
      api.getUsers(userCompanyId),
      api.getMessages(),
      api.getProjects(userCompanyId)
    ]);

    const scope = contactKey ? new Set(contactKey.split(',')) : null;
    const filteredUsers = (allUsers || []).filter(
      (u) => u.id !== userId && u.status === 'active' && u.role !== 'superuser' && (!scope || scope.has(u.id))
    );

    setContacts(filteredUsers);
    setMessages(Array.isArray(allMsgs) ? allMsgs : []);
    setProjects(Array.isArray(allProjects) ? allProjects : []);

    setActiveContact((prev) => {
      if (prev && filteredUsers.some((u) => u.id === prev.id)) return prev;
      if (filteredUsers.length === 0) return null;
      const sortedByLatest = [...filteredUsers].sort((a, b) => {
        const getLatest = (cId) => {
          const thread = (allMsgs || []).filter((m) => {
            const isMe = m.senderId === userId || m.from === userId;
            const isC = m.senderId === cId || m.from === cId;
            const isToMe = m.receiverId === userId || m.to === userId;
            const isToC = m.receiverId === cId || m.to === cId;
            return (isMe && isToC) || (isC && isToMe);
          });
          if (thread.length === 0) return 0;
          const s = [...thread].sort((x, y) => parseMessageTimestamp(y) - parseMessageTimestamp(x));
          return parseMessageTimestamp(s[0]);
        };
        return getLatest(b.id) - getLatest(a.id);
      });
      return sortedByLatest[0];
    });
  }, [userId, userCompanyId, contactKey]);

  // Initial load + 8s background polling for live incoming replies (pauses when tab is hidden)
  useEffect(() => {
    const first = setTimeout(() => { void loadInitialData(); }, 0);
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshMessages();
      }
    }, 8000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [loadInitialData, refreshMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeContact?.id]);

  function selectContact(c) {
    setActiveContact(c);
    setMobileChatOpen(true);
    setShowInChatSearch(false);
    setInChatSearch('');
    setShowEmojiBar(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function handleSendMessage(e) {
    e?.preventDefault();
    if (!inputText.trim() || !activeContact || !user) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA');
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const fullTimestamp = `${dateStr} ${timeStr}`;
    const trimmed = inputText.trim();

    // Route multi-company client messages to the recipient's company workspace
    const targetCompanyId = user.companyId || activeContact.companyId || '';

    const newMsg = {
      companyId: targetCompanyId,
      senderId: user.id,
      senderName: user.name,
      from: user.id,
      to: activeContact.id,
      receiverId: activeContact.id,
      receiverName: activeContact.name,
      text: trimmed,
      timestamp: fullTimestamp,
      date: dateStr,
      time: timeStr
    };

    setInputText('');
    setShowEmojiBar(false);

    const sent = await api.sendMessage(newMsg);
    if (sent && sent.error) {
      setInputText(trimmed);
      toast.error(sent.message || 'Message could not be sent.');
      return;
    }
    await api.createNotification({
      userId: activeContact.id,
      companyId: activeContact.companyId || targetCompanyId,
      type: 'message',
      title: `Message from ${user.name}`,
      body: trimmed.substring(0, 80),
      date: dateStr,
      time: 'Just now',
      read: false
    });

    await refreshMessages();
  }

  function handleInsertEmoji(emoji) {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  }

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const parts = timestamp.split(' ');
    if (parts.length > 1) {
      const [h, m] = parts[1].split(':');
      if (h !== undefined && m !== undefined) {
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedH = hour % 12 || 12;
        return `${formattedH}:${m} ${ampm}`;
      }
      return parts[1];
    }
    return timestamp;
  }

  function getDateHeader(timestamp) {
    if (!timestamp) return 'TODAY';
    const datePart = timestamp.split(' ')[0];
    const todayStr = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    if (datePart === todayStr) return 'TODAY';
    if (datePart === yesterdayStr) return 'YESTERDAY';

    const d = new Date(datePart);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    }
    return datePart;
  }

  // Only show role filter chips that actually have matching contacts
  const roleChips = [
    { key: 'all', label: 'All', match: () => true },
    { key: 'admins', label: 'Managers', match: (c) => c.role === 'company_admin' || c.role === 'project_manager' },
    { key: 'engineers', label: 'Engineers', match: (c) => c.role === 'site_engineer' },
    { key: 'finance', label: 'Finance', match: (c) => c.role === 'finance_manager' },
    { key: 'procurement', label: 'Procurement', match: (c) => c.role === 'procurement_storekeeper' },
    { key: 'clients', label: 'Clients', match: (c) => c.role === 'client' }
  ].filter((chip) => chip.key === 'all' || contacts.some(chip.match));

  const activeChip = roleChips.find((ch) => ch.key === categoryFilter) || roleChips[0];
  const categoryFilteredContacts = contacts.filter(activeChip.match);

  const displayedContacts = categoryFilteredContacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.role || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  });

  function getLatestMsgTime(cId) {
    const thread = messages.filter((m) => {
      const isMe = m.senderId === user.id || m.from === user.id;
      const isC = m.senderId === cId || m.from === cId;
      const isToMe = m.receiverId === user.id || m.to === user.id;
      const isToC = m.receiverId === cId || m.to === cId;
      return (isMe && isToC) || (isC && isToMe);
    });
    if (thread.length === 0) return 0;
    const sorted = [...thread].sort((a, b) => parseMessageTimestamp(b) - parseMessageTimestamp(a));
    return parseMessageTimestamp(sorted[0]);
  }

  const sortedContacts = [...displayedContacts].sort((a, b) => getLatestMsgTime(b.id) - getLatestMsgTime(a.id));

  const conversationMessages = messages
    .filter((m) => {
      if (!activeContact) return false;
      const isMeSender = m.senderId === user.id || m.from === user.id;
      const isMeReceiver = m.receiverId === user.id || m.to === user.id;
      const isContactSender = m.senderId === activeContact.id || m.from === activeContact.id;
      const isContactReceiver = m.receiverId === activeContact.id || m.to === activeContact.id;
      return (isMeSender && isContactReceiver) || (isContactSender && isMeReceiver);
    })
    .sort((a, b) => parseMessageTimestamp(a) - parseMessageTimestamp(b));

  const contactProjects = projects.filter(
    (p) =>
      p.managerId === activeContact?.id ||
      p.siteEngineerId === activeContact?.id ||
      p.financeManagerId === activeContact?.id ||
      p.clientId === activeContact?.id ||
      p.clientEmail === activeContact?.email
  );

  return (
    <div className="wa-container">
      {/* Left Sidebar: Team & Project Contacts */}
      <div className={`wa-sidebar ${mobileChatOpen ? 'hide-mobile' : ''}`}>
        <div className="wa-sidebar-header">
          <div className="wa-sidebar-user">
            <div
              className="wa-sidebar-user-avatar"
              style={{ background: avatarColor(user?.name || 'ME') }}
            >
              {(user?.name || 'ME').substring(0, 2).toUpperCase()}
            </div>
            <div className="wa-sidebar-user-info">
              <strong>{user?.name}</strong>
              <span>{roleLabel(user?.role)}</span>
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
              background: '#f1f5f9',
              padding: '3px 8px',
              borderRadius: 999
            }}
          >
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
          </span>
        </div>

        <div className="wa-search-container">
          <div className="wa-search-bar">
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              className="wa-search-input"
              placeholder="Search teammates or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <X
                size={14}
                style={{ cursor: 'pointer', color: '#94a3b8' }}
                onClick={() => setSearchQuery('')}
              />
            )}
          </div>
        </div>

        {roleChips.length > 2 && (
          <div className="wa-filter-chips">
            {roleChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={`wa-chip ${activeChip.key === chip.key ? 'active' : ''}`}
                onClick={() => setCategoryFilter(chip.key)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        <div className="wa-chat-list">
          {sortedContacts.length > 0 ? (
            sortedContacts.map((c) => {
              const cMsgs = messages.filter((m) => {
                const isMe = m.senderId === user.id || m.from === user.id;
                const isC = m.senderId === c.id || m.from === c.id;
                const isToMe = m.receiverId === user.id || m.to === user.id;
                const isToC = m.receiverId === c.id || m.to === c.id;
                return (isMe && isToC) || (isC && isToMe);
              });

              const lastMsg = [...cMsgs].sort((a, b) => parseMessageTimestamp(a) - parseMessageTimestamp(b)).slice(-1)[0];
              const isLastMsgMine = lastMsg && (lastMsg.senderId === user.id || lastMsg.from === user.id);
              const initials = c.name.substring(0, 2).toUpperCase();
              const isSelected = activeContact?.id === c.id;

              return (
                <div
                  key={c.id}
                  className={`wa-chat-item ${isSelected ? 'active' : ''}`}
                  onClick={() => selectContact(c)}
                >
                  <div className="wa-avatar-box">
                    <div
                      className="wa-avatar"
                      style={{ background: avatarColor(initials) }}
                    >
                      {initials}
                    </div>
                  </div>

                  <div className="wa-chat-item-content">
                    <div className="wa-chat-item-top">
                      <span className="wa-chat-name">{c.name}</span>
                      <span className="wa-chat-time">
                        {lastMsg ? formatTime(lastMsg.timestamp || lastMsg.time) : ''}
                      </span>
                    </div>

                    <div className="wa-chat-item-bottom">
                      <div className="wa-chat-preview">
                        {isLastMsgMine && (
                          <CheckCheck size={13} color="#ea580c" style={{ flexShrink: 0 }} />
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lastMsg ? lastMsg.text : 'Start a conversation'}
                        </span>
                      </div>
                      <span className="wa-role-pill">{roleLabel(c.role)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No contacts match your search
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Conversation Thread */}
      {activeContact ? (
        <div className={`wa-chat-main ${!mobileChatOpen ? 'hide-mobile' : ''}`}>
          <div className="wa-chat-header">
            <div className="wa-chat-header-left" onClick={() => setShowInfoDrawer(!showInfoDrawer)}>
              <button
                type="button"
                className="wa-back-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileChatOpen(false);
                }}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="wa-avatar-box">
                <div
                  className="wa-avatar"
                  style={{
                    width: 38,
                    height: 38,
                    fontSize: 13,
                    background: avatarColor(activeContact.name)
                  }}
                >
                  {activeContact.name.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="wa-chat-header-title">
                <strong>{activeContact.name}</strong>
                <span className="wa-chat-header-status">
                  {roleLabel(activeContact.role)}
                  {contactProjects.length > 0 ? ` · ${contactProjects[0].name}` : ''}
                </span>
              </div>
            </div>

            <div className="wa-chat-header-actions">
              <button
                type="button"
                className="wa-action-icon"
                title="Search in conversation"
                onClick={() => setShowInChatSearch(!showInChatSearch)}
              >
                <Search size={17} />
              </button>
              <button
                type="button"
                className="wa-action-icon"
                title="Contact info"
                onClick={() => setShowInfoDrawer(!showInfoDrawer)}
              >
                <Info size={17} />
              </button>
            </div>
          </div>

          {showInChatSearch && (
            <div className="wa-inchat-search">
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                className="wa-search-input"
                placeholder="Search in this conversation..."
                value={inChatSearch}
                onChange={(e) => setInChatSearch(e.target.value)}
                autoFocus
              />
              {inChatSearch && (
                <X
                  size={14}
                  style={{ cursor: 'pointer', color: '#94a3b8' }}
                  onClick={() => setInChatSearch('')}
                />
              )}
            </div>
          )}

          <div className="wa-messages-thread">
            {conversationMessages.length > 0 ? (
              conversationMessages.map((m, idx) => {
                const isOut = m.senderId === user.id || m.from === user.id;
                const currentDateHeader = getDateHeader(m.timestamp || m.date);
                const prevDateHeader =
                  idx > 0 ? getDateHeader(conversationMessages[idx - 1].timestamp || conversationMessages[idx - 1].date) : null;
                const showDateHeader = currentDateHeader !== prevDateHeader;
                const isMatch = inChatSearch && (m.text || '').toLowerCase().includes(inChatSearch.toLowerCase());

                return (
                  <React.Fragment key={m.id || idx}>
                    {showDateHeader && (
                      <div className="wa-date-divider">
                        <span className="wa-date-pill">{currentDateHeader}</span>
                      </div>
                    )}
                    <div className={`wa-bubble-row ${isOut ? 'out' : 'in'}`}>
                      <div className={`wa-bubble ${isOut ? 'out' : 'in'} ${isMatch ? 'highlighted' : ''}`}>
                        <div className="wa-bubble-text">{m.text}</div>
                        <div className="wa-bubble-meta">
                          <span>{formatTime(m.timestamp || m.time)}</span>
                          {isOut && (
                            <span className="wa-ticks">
                              <CheckCheck size={13} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  color: '#64748b',
                  textAlign: 'center',
                  gap: 8
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ea580c'
                  }}
                >
                  <MessageSquare size={22} />
                </div>
                <strong style={{ color: '#0f172a', fontSize: 14.5 }}>No messages yet</strong>
                <p style={{ fontSize: 13, maxWidth: 280, margin: 0 }}>
                  Send a message to start coordinating with {activeContact.name}.
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {showEmojiBar && (
            <div className="wa-emoji-strip">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="wa-emoji-btn"
                  onClick={() => handleInsertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <form className="wa-input-bar" onSubmit={handleSendMessage}>
            <button
              type="button"
              className="wa-tool-btn"
              title="Insert quick emoji"
              onClick={() => setShowEmojiBar(!showEmojiBar)}
            >
              <Smile size={19} />
            </button>
            <input
              type="text"
              ref={inputRef}
              className="wa-input-box"
              placeholder={`Message ${activeContact.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
              type="submit"
              className="wa-send-btn"
              disabled={!inputText.trim()}
              title="Send message"
            >
              <Send size={16} />
            </button>
          </form>

          {showInfoDrawer && (
            <div className="wa-drawer-overlay">
              <div className="wa-drawer-header">
                <strong style={{ fontSize: 14.5, color: '#0f172a' }}>Contact Info</strong>
                <button
                  type="button"
                  className="wa-action-icon"
                  onClick={() => setShowInfoDrawer(false)}
                >
                  <X size={17} />
                </button>
              </div>

              <div className="wa-drawer-body">
                <div style={{ textAlign: 'center', marginBottom: 22 }}>
                  <div
                    className="wa-avatar"
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 18,
                      fontSize: 22,
                      margin: '0 auto 12px auto',
                      background: avatarColor(activeContact.name)
                    }}
                  >
                    {activeContact.name.substring(0, 2).toUpperCase()}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a' }}>
                    {activeContact.name}
                  </h3>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      background: '#fff7ed',
                      color: '#ea580c',
                      border: '1px solid #fed7aa',
                      padding: '3px 10px',
                      borderRadius: 999
                    }}
                  >
                    {roleLabel(activeContact.role)}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Mail size={15} color="#ea580c" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Email Address</div>
                      <a
                        href={`mailto:${activeContact.email}`}
                        style={{ fontSize: 13, color: '#0f172a', textDecoration: 'none', fontWeight: 500, wordBreak: 'break-all' }}
                      >
                        {activeContact.email}
                      </a>
                    </div>
                  </div>

                  {activeContact.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Phone size={15} color="#ea580c" />
                      <div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Phone</div>
                        <a
                          href={`tel:${activeContact.phone}`}
                          style={{ fontSize: 13, color: '#0f172a', textDecoration: 'none', fontWeight: 500 }}
                        >
                          {activeContact.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Building2 size={15} color="#ea580c" style={{ marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Assigned Projects</div>
                      {contactProjects.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 5 }}>
                          {contactProjects.map((p) => (
                            <span
                              key={p.id}
                              style={{
                                fontSize: 12,
                                color: '#0f172a',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '4px 9px',
                                borderRadius: 8
                              }}
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>All company projects</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="wa-empty-screen">
          <div className="wa-empty-graphic">
            <MessageSquare size={28} />
          </div>
          <h2>ConstructHub Messages</h2>
          <p>
            Coordinate directly with project managers, site engineers, storekeepers, finance teams, and clients.
          </p>
          <div className="wa-empty-footer">
            <Shield size={14} color="#94a3b8" />
            <span>Private to your ConstructHub project workspace</span>
          </div>
        </div>
      )}
    </div>
  );
}
