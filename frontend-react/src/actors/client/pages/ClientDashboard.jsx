import React, { useState, useEffect } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Receipt,
  Building2,
  Send,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatCurrency,
  formatDate,
  statusBadge,
  normalizeBillStatus
} from '../../../services/utils';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function ClientDashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [pendingBills, setPendingBills] = useState([]);
  const [approvedBills, setApprovedBills] = useState([]);

  // Quick feedback form
  const [category, setCategory] = useState('Quality of Work');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    const [allProjects, allBills] = await Promise.all([
      api.getProjects(user.companyId),
      api.getBills(user.companyId)
    ]);

    const myProj = (allProjects || []).find(
      (p) => p.clientId === user.id || p.clientEmail === user.email || p.clientName === user.name
    );
    setProject(myProj || null);

    const clientBills = (allBills || []).filter(
      (b) => b.clientId === user.id || b.clientEmail === user.email || b.clientName === user.name
    );
    const pending = clientBills.filter(
      (b) => normalizeBillStatus(b.status) === 'Pending Decision'
    );
    const approved = clientBills.filter((b) => normalizeBillStatus(b.status) === 'Accepted');

    setPendingBills(pending);
    setApprovedBills(approved);
  }

  // Days remaining calculation
  let daysRemaining = 'On Schedule';
  if (project && project.endDate) {
    const end = new Date(project.endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    daysRemaining = diff > 0 ? `${diff} days` : diff === 0 ? 'Due today' : 'Past deadline';
  }

  async function handleQuickFeedback(e) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setFeedbackError('Subject and message are required.');
      return;
    }
    if (!project) {
      setFeedbackError('No active project found.');
      return;
    }

    try {
      await api.createNotification({
        userId: project.managerId || user.companyId,
        type: 'feedback',
        title: 'Client Feedback',
        body: message.trim(),
        clientId: user.id,
        clientName: user.name,
        projectId: project.id,
        projectName: project.name,
        category,
        subject: subject.trim(),
        priority,
        createdAt: new Date().toISOString()
      });

      setSubject('');
      setMessage('');
      setFeedbackError('');
      setFeedbackSuccess(true);
    } catch (err) {
      setFeedbackError(err.message || 'Failed to submit feedback.');
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Welcome, {user?.name}</h1>
        <p className="page-subtitle">Track your project milestones, review invoices, and communicate with the team</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon"><div className="icon-box icon-box-orange"><TrendingUp size={20} /></div></div>
          <div className="stat-value">{project ? `${project.progress || 0}%` : '0%'}</div>
          <div className="stat-label">Project Progress</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><div className="icon-box icon-box-blue"><DollarSign size={20} /></div></div>
          <div className="stat-value" style={{ fontSize: '18px' }}>
            {project ? formatCurrency(project.spent || 0) : '₹0'}
          </div>
          <div className="stat-label">Budget Utilized</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><div className="icon-box icon-box-purple"><Clock size={20} /></div></div>
          <div className="stat-value">{daysRemaining}</div>
          <div className="stat-label">Timeline Remaining</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><div className="icon-box icon-box-red"><Receipt size={20} /></div></div>
          <div className="stat-value">{pendingBills.length}</div>
          <div className="stat-label">Bills Awaiting Action</div>
        </div>
      </div>

      {/* Active Project Overview */}
      {project ? (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{project.name}</h3>
                <span className={`badge ${statusBadge(project.status)}`}>{project.status}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Location: {project.location} · Manager: {project.managerName || 'Project Manager'}
              </p>
            </div>
            <Link to="/client/project-progress" className="btn btn-secondary btn-sm">
              View Complete Progress
            </Link>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
              <span>Overall Completion</span>
              <strong>{project.progress || 0}%</strong>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${project.progress || 0}%` }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <div>Total Contract: <strong style={{ color: 'var(--primary)' }}>{formatCurrency(project.budget)}</strong></div>
            <div>Deadline: <strong>{formatDate(project.endDate)}</strong></div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '20px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No active project linked to your account.</p>
        </div>
      )}

      {/* Grid: Pending Bills & Quick Feedback */}
      <div className="grid-2">
        {/* Pending Bills Card */}
        <div className="card">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div className="section-title">Pending Payment Bills</div>
            <Link to="/client/pending-bills" className="btn btn-secondary btn-sm">
              Review Bills
            </Link>
          </div>

          {pendingBills.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><CheckCircle2 size={28} /></div>
              <p>All bills are up to date! No pending payments.</p>
            </div>
          ) : (
            pendingBills.map((b) => (
              <div
                key={b.id}
                style={{
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong>{b.id}</strong>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(b.amount)}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {b.milestone} · Due: {formatDate(b.dueDate)}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link to="/client/pending-bills" className="btn btn-primary btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                    Review & Decide
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Feedback Card */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: '14px' }}>Submit Quick Feedback</div>
          <form onSubmit={handleQuickFeedback}>
            {feedbackError && (
              <div className="error-alert" style={{ marginBottom: '10px' }}>{feedbackError}</div>
            )}
            {feedbackSuccess && (
              <div style={{ background: 'var(--emerald-50, #ecfdf5)', color: 'var(--emerald-700, #047857)', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px' }}>
                Thank you! Your feedback has been sent to the project team.
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>Quality of Work</option>
                <option>Timeline</option>
                <option>Communication</option>
                <option>Budget</option>
                <option>Safety</option>
                <option>General</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subject <span className="req">*</span></label>
              <input
                type="text"
                className="form-input"
                placeholder="Brief subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Message <span className="req">*</span></label>
              <textarea
                className="form-textarea"
                placeholder="Share your thoughts or concerns..."
                style={{ minHeight: '80px' }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <Button variant="primary" type="submit" style={{ width: '100%' }}>
              <Send size={14} style={{ marginRight: '6px' }} /> Send Feedback
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
