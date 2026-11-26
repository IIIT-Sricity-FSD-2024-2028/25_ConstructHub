import LiveSummary from '../../../components/dashboard/LiveSummary';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector, useLoad } from '../../../store/hooks';
import { selectCurrentUser } from '../../../features/auth/authSlice';
import { fetchProjects, selectProjectsOfClient } from '../../../features/projects/projectsSlice';
import { fetchBills, selectAllBills } from '../../../features/bills/billsSlice';
import { submitFeedback } from '../../../features/finance/financeSlice';
import {
  Send,
  CheckCircle2
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  normalizeBillStatus
} from '../../../services/utils';
import Button from '../../../components/common/Button';

export default function ClientDashboard() {
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const myProjects = useAppSelector((state) => selectProjectsOfClient(state, user?.id));
  const allBills = useAppSelector(selectAllBills);
  useLoad([fetchProjects, fetchBills]);
  const [pickedProjectId, setPickedProjectId] = useState('');
  const project = myProjects.find((p) => p.id === pickedProjectId) || myProjects[0] || null;

  // Bills of all the client's projects that are waiting for the client's decision.
  const pendingBills = useMemo(() => allBills.filter((b) =>
    (b.clientId === user?.id || b.clientEmail === user?.email) &&
    normalizeBillStatus(b.status) === 'Pending Decision'), [allBills, user]);

  // Quick feedback form
  const [category, setCategory] = useState('Quality of Work');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority] = useState('Medium');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');



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
      // Saved as a real feedback record (same as the Feedback page), so the PM sees it and it shows in history.
      await dispatch(submitFeedback({
        projectId: project.id,
        category,
        subject: subject.trim(),
        message: message.trim(),
        priority
      })).unwrap();

      setSubject('');
      setMessage('');
      setFeedbackError('');
      setFeedbackSuccess(true);
    } catch (err) {
      setFeedbackSuccess(false);
      setFeedbackError((typeof err === 'string' ? err : err?.message) || 'Failed to submit feedback.');
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Welcome, {user?.name}</h1>
        <p className="page-subtitle">Track your project milestones, review invoices, and communicate with the team</p>
      </div>

      <LiveSummary />

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

            {myProjects.length > 1 && (
              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-select" value={project?.id || ''} onChange={(e) => setPickedProjectId(e.target.value)}>
                  {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
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
