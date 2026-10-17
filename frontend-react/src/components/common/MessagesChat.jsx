import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Search,
  CheckCheck,
  Check,
  Smile,
  Paperclip,
  Phone,
  Mail,
  User,
  ArrowLeft,
  X,
  MessageSquare,
  Shield,
  Info,
  Building2,
  Calendar
} from 'lucide-react';
import { api } from '../../services/api';
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

export default function MessagesChat({ user }) {
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
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadInitialData();
  }, [user]);

  async function loadInitialData() {
    if (!user) return;
    const [allUsers, allMsgs, allProjects] = await Promise.all([
      api.getUsers(user.companyId),
      api.getMessages(user.companyId),
      api.getProjects(user.companyId)
    ]);

    const filteredUsers = (allUsers || []).filter(
      (u) => u.id !== user.id && u.status === 'active' && u.role !== 'superuser'
    );

    setContacts(filteredUsers);
    setMessages(allMsgs || []);
    setProjects(allProjects || []);

    if (filteredUsers.length > 0 && !activeContact) {
      const sortedByLatest = [...filteredUsers].sort((a, b) => {
        const getLatest = (cId) => {
          const thread = (allMsgs || []).filter((m) => {
            const isMe = m.senderId === user.id || m.from === user.id;
            const isC = m.senderId === cId || m.from === cId;
            const isToMe = m.receiverId === user.id || m.to === user.id;
            const isToC = m.receiverId === cId || m.to === cId;
            return (isMe && isToC) || (isC && isToMe);
          });
          if (thread.length === 0) return 0;
          const s = [...thread].sort((x, y) => parseMessageTimestamp(y) - parseMessageTimestamp(x));
          return parseMessageTimestamp(s[0]);
        };
        return getLatest(b.id) - getLatest(a.id);
      });
      setActiveContact(sortedByLatest[0]);
    }
  }

  async function refreshMessages() {
    if (!user) return;
    const allMsgs = await api.getMessages(user.companyId);
    setMessages(allMsgs || []);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeContact]);

  // Handle contact click
  function selectContact(c) {
    setActiveContact(c);
    setMobileChatOpen(true);
    setShowInChatSearch(false);
    setInChatSearch('');
    setShowEmojiBar(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  // Send message
  async function handleSendMessage(e) {
    e?.preventDefault();
    if (!inputText.trim() || !activeContact || !user) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA');
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const fullTimestamp = `${dateStr} ${timeStr}`;

    const newMsg = {
      companyId: user.companyId || '',
      senderId: user.id,
      senderName: user.name,
      from: user.id,
      to: activeContact.id,
      receiverId: activeContact.id,
      receiverName: activeContact.name,
      text: inputText.trim(),
      timestamp: fullTimestamp,
      date: dateStr,
      time: timeStr
    };

    setInputText('');
    setShowEmojiBar(false);

    await api.sendMessage(newMsg);
    await api.createNotification({
      userId: activeContact.id,
      title: `Message from ${user.name}`,
      body: inputText.trim().substring(0, 60),
      time: 'just now',
      read: false
    });

    await refreshMessages();
  }

  // Handle file attachment simulation
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !activeContact || !user) return;

    const isImage = file.type.startsWith('image/');
    const icon = isImage ? '📷 Photo' : '📄 File';
    const text = `${icon}: ${file.name}`;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA');
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    api.sendMessage({
      companyId: user.companyId || '',
      senderId: user.id,
      senderName: user.name,
      from: user.id,
      to: activeContact.id,
      receiverId: activeContact.id,
      receiverName: activeContact.name,
      text,
      timestamp: `${dateStr} ${timeStr}`,
      date: dateStr,
      time: timeStr
    }).then(() => refreshMessages());

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Insert emoji
  function handleInsertEmoji(emoji) {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  }

  // Date and Time formatting helpers
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


  // Filter contacts by category tab
  const categoryFilteredContacts = contacts.filter((c) => {
    if (categoryFilter === 'engineers') return c.role === 'site_engineer';
    if (categoryFilter === 'clients') return c.role === 'client';
    if (categoryFilter === 'finance') return c.role === 'finance_manager';
    if (categoryFilter === 'admins') return c.role === 'company_admin' || c.role === 'project_manager';
    return true;
  });

  // Search filter
  const displayedContacts = categoryFilteredContacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.role || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  });

  // Helper to get latest message timestamp with a contact
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

  // Sort contacts so the one with the latest message is on top of the sidebar list
  const sortedContacts = [...displayedContacts].sort((a, b) => {
    return getLatestMsgTime(b.id) - getLatestMsgTime(a.id);
  });

  // Active conversation messages: sorted chronologically (oldest at top, newest added at the bottom)
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

  // Contact's assigned projects
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
      {/* ── Hidden File Input for Attachments ── */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* ── Left Sidebar (WhatsApp Contacts & Chats) ── */}
      <div className={`wa-sidebar ${mobileChatOpen ? 'hide-mobile' : ''}`}>
        {/* Sidebar Header */}
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
        </div>

        {/* Search Bar */}
        <div className="wa-search-container">
          <div className="wa-search-bar">
            <Search size={16} color="#8696a0" />
            <input
              type="text"
              className="wa-search-input"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <X
                size={14}
                style={{ cursor: 'pointer', color: '#8696a0' }}
                onClick={() => setSearchQuery('')}
              />
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="wa-filter-chips">
          <button
            type="button"
            className={`wa-chip ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`wa-chip ${categoryFilter === 'engineers' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('engineers')}
          >
            Engineers
          </button>
          <button
            type="button"
            className={`wa-chip ${categoryFilter === 'clients' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('clients')}
          >
            Clients
          </button>
          <button
            type="button"
            className={`wa-chip ${categoryFilter === 'finance' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('finance')}
          >
            Finance
          </button>
          <button
            type="button"
            className={`wa-chip ${categoryFilter === 'admins' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('admins')}
          >
            Admins
          </button>
        </div>

        {/* Chat List */}
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

              const lastMsg = cMsgs.slice(-1)[0];
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
                          <CheckCheck size={14} color="#53bdeb" style={{ flexShrink: 0 }} />
                        )}
                        <span>{lastMsg ? lastMsg.text : 'Click to start chatting'}</span>
                      </div>
                      <span className="wa-role-pill">{roleLabel(c.role)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: '#8696a0', fontSize: 13 }}>
              No contacts found
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel (WhatsApp Chat Thread) ── */}
      {activeContact ? (
        <div className={`wa-chat-main ${!mobileChatOpen ? 'hide-mobile' : ''}`}>
          {/* WhatsApp Chat Header */}
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
                    width: 40,
                    height: 40,
                    fontSize: 14,
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
                </span>
              </div>
            </div>

            <div className="wa-chat-header-actions">
              <button
                type="button"
                className="wa-action-icon"
                title="Search in chat"
                onClick={() => setShowInChatSearch(!showInChatSearch)}
              >
                <Search size={18} />
              </button>
              <button
                type="button"
                className="wa-action-icon"
                title="Contact info"
                onClick={() => setShowInfoDrawer(!showInfoDrawer)}
              >
                <Info size={18} />
              </button>
            </div>
          </div>

          {/* Optional In-Chat Search Bar */}
          {showInChatSearch && (
            <div className="wa-inchat-search">
              <Search size={15} color="#8696a0" />
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
                  style={{ cursor: 'pointer', color: '#8696a0' }}
                  onClick={() => setInChatSearch('')}
                />
              )}
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="wa-messages-thread">
            {conversationMessages.length > 0 ? (
              conversationMessages.map((m, idx) => {
                const isOut = m.senderId === user.id || m.from === user.id;
                const currentDateHeader = getDateHeader(m.timestamp || m.date);
                const prevDateHeader =
                  idx > 0 ? getDateHeader(conversationMessages[idx - 1].timestamp || conversationMessages[idx - 1].date) : null;
                const showDateHeader = currentDateHeader !== prevDateHeader;

                const isMatch = inChatSearch && m.text.toLowerCase().includes(inChatSearch.toLowerCase());

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
                              <CheckCheck size={14} />
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
                  color: '#667781',
                  textAlign: 'center',
                  gap: 8
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    padding: 8,
                    borderRadius: 12,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                  }}
                >
                  <MessageSquare size={24} color="#00a884" />
                </div>
                <strong style={{ color: '#111b21', fontSize: 14 }}>No messages yet</strong>
                <p style={{ fontSize: 12.5, maxWidth: 260 }}>
                  Send a greeting to start a real-time conversation with {activeContact.name}.
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Emoji Reaction Strip */}
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

          {/* Bottom WhatsApp Input Bar */}
          <form className="wa-input-bar" onSubmit={handleSendMessage}>
            <button
              type="button"
              className="wa-tool-btn"
              title="Add Emoji"
              onClick={() => setShowEmojiBar(!showEmojiBar)}
            >
              <Smile size={20} />
            </button>
            <button
              type="button"
              className="wa-tool-btn"
              title="Attach document or photo"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={20} />
            </button>
            <input
              type="text"
              ref={inputRef}
              className="wa-input-box"
              placeholder={`Type a message to ${activeContact.name}...`}
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
              title="Send (Enter)"
            >
              <Send size={16} />
            </button>
          </form>

          {/* ── Contact Info Slideout Drawer ── */}
          {showInfoDrawer && (
            <div className="wa-drawer-overlay">
              <div className="wa-drawer-header">
                <strong style={{ fontSize: 15, color: '#111b21' }}>Contact Info</strong>
                <button
                  type="button"
                  className="wa-action-icon"
                  onClick={() => setShowInfoDrawer(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="wa-drawer-body">
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div
                    className="wa-avatar"
                    style={{
                      width: 72,
                      height: 72,
                      fontSize: 24,
                      margin: '0 auto 12px auto',
                      background: avatarColor(activeContact.name)
                    }}
                  >
                    {activeContact.name.substring(0, 2).toUpperCase()}
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px 0', color: '#111b21' }}>
                    {activeContact.name}
                  </h3>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      background: '#d9fdd3',
                      color: '#00a884',
                      padding: '2px 10px',
                      borderRadius: 12
                    }}
                  >
                    {roleLabel(activeContact.role)}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Mail size={16} color="#00a884" />
                    <div>
                      <div style={{ fontSize: 11, color: '#8696a0' }}>Email Address</div>
                      <a
                        href={`mailto:${activeContact.email}`}
                        style={{ fontSize: 13, color: '#111b21', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {activeContact.email}
                      </a>
                    </div>
                  </div>

                  {activeContact.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Phone size={16} color="#00a884" />
                      <div>
                        <div style={{ fontSize: 11, color: '#8696a0' }}>Phone</div>
                        <a
                          href={`tel:${activeContact.phone}`}
                          style={{ fontSize: 13, color: '#111b21', textDecoration: 'none', fontWeight: 500 }}
                        >
                          {activeContact.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
                    <Building2 size={16} color="#00a884" style={{ marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 11, color: '#8696a0' }}>Assigned Projects</div>
                      {contactProjects.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                          {contactProjects.map((p) => (
                            <span
                              key={p.id}
                              style={{
                                fontSize: 12,
                                color: '#111b21',
                                background: '#f0f2f5',
                                padding: '3px 8px',
                                borderRadius: 6
                              }}
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#8696a0' }}>All company projects</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty Splash Screen when no chat selected */
        <div className="wa-empty-screen">
          <div className="wa-empty-graphic">
            <MessageSquare size={36} />
          </div>
          <h2>ConstructHub Web</h2>
          <p>
            Send and receive messages with your site engineers, clients, and finance managers in real-time.
          </p>
          <div className="wa-empty-footer">
            <Shield size={14} color="#8696a0" />
            <span>End-to-end encrypted within your enterprise workspace</span>
          </div>
        </div>
      )}
    </div>
  );
}
