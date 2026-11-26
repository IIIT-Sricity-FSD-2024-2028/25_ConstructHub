import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, useLoad } from '../../../store/hooks';
import { selectCurrentUser } from '../../../features/auth/authSlice';
import { fetchProjects, selectProjectsOfClient } from '../../../features/projects/projectsSlice';
import { fetchFeedback, submitFeedback, selectAllFeedback } from '../../../features/finance/financeSlice';
import {
  Send,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';

export default function ClientFeedback({ projectId } = {}) {
  const user = useAppSelector(selectCurrentUser);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const myProjects = useAppSelector((state) => selectProjectsOfClient(state, user?.id));
  const allFeedback = useAppSelector(selectAllFeedback);
  useLoad([fetchProjects, fetchFeedback]);

  // Inside a project workspace the project is fixed; on the general page the client picks one of theirs.
  const [pickedProjectId, setPickedProjectId] = useState('');
  const project = myProjects.find((p) => p.id === (projectId || pickedProjectId)) || (projectId ? null : myProjects[0]) || null;
  const [category, setCategory] = useState('Quality of Work');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('Medium');

  const [errors, setErrors] = useState({});
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const history = useMemo(
    () => (projectId ? allFeedback.filter((f) => f.projectId === projectId) : allFeedback),
    [allFeedback, projectId]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};

    if (!category) errs.category = 'Please select a category';
    if (!subject.trim()) {
      errs.subject = 'This field is required';
    } else if (subject.length > 100) {
      errs.subject = 'Max 100 characters';
    }

    if (!message.trim()) {
      errs.message = 'This field is required';
    } else if (message.length > 1000) {
      errs.message = 'Max 1000 characters';
    }

    if (!project) {
      errs.form = 'No active project found to link feedback.';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      await dispatch(submitFeedback({
        projectId: project.id,
        category,
        subject: subject.trim(),
        message: message.trim(),
        priority
      })).unwrap(); // the new entry appears in the history list from the store

      setSubject('');
      setMessage('');
      setPriority('Low');
      setIsSuccessOpen(true);
    } catch (err) {
      setErrors({ form: (typeof err === 'string' ? err : err?.message) || 'Failed to submit feedback' });
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1 className="page-title">Project Feedback</h1>
        <p className="page-subtitle">Provide direct feedback, suggestions, or quality notes to your project team</p>
      </div>

      <div style={{ maxWidth: '600px' }}>
        <div className="card">
          <form onSubmit={handleSubmit}>
            {errors.form && (
              <div className="error-alert" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {errors.form}
              </div>
            )}

            {!projectId && myProjects.length > 1 && (
              <div className="form-group">
                <label className="form-label">Project <span className="req">*</span></label>
                <select className="form-select" value={project?.id || ''} onChange={(e) => setPickedProjectId(e.target.value)}>
                  {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Feedback Category <span className="req">*</span></label>
              <select
                className={`form-select ${errors.category ? 'input-error' : ''}`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Quality of Work">Quality of Work</option>
                <option value="Timeline">Timeline</option>
                <option value="Communication">Communication</option>
                <option value="Budget">Budget</option>
                <option value="Safety">Safety</option>
                <option value="General">General</option>
              </select>
              {errors.category && <span className="field-error">{errors.category}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Subject <span className="req">*</span></label>
              <input
                type="text"
                className={`form-input ${errors.subject ? 'input-error' : ''}`}
                placeholder="Brief subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <span className="form-hint">Max 100 characters</span>
              {errors.subject && <span className="field-error">{errors.subject}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Message <span className="req">*</span></label>
              <textarea
                className={`form-textarea ${errors.message ? 'input-error' : ''}`}
                placeholder="Share your feedback, requirements, or concerns in detail..."
                style={{ minHeight: '120px' }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <span className="form-hint">Max 1000 characters</span>
              {errors.message && <span className="field-error">{errors.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <Button variant="primary" type="submit" style={{ width: '100%', padding: '12px' }}>
              <Send size={15} style={{ marginRight: '6px' }} /> Submit Feedback
            </Button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Submitted Feedback</h3>
        {history.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>You have not sent any feedback yet. Everything you send is kept here.</p>
        ) : (
          <table className="data-table" style={{ minWidth: 560 }}>
            <thead><tr><th>Date</th><th>Project</th><th>Category</th><th>Subject</th><th>Priority</th></tr></thead>
            <tbody>
              {history.map((f) => (
                <tr key={f.id}>
                  <td>{new Date(f.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>{f.projectName}</td>
                  <td>{f.category}</td>
                  <td><strong>{f.subject}</strong><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.message}</div></td>
                  <td>{f.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Success Modal */}
      {isSuccessOpen && (
        <Modal
          isOpen={isSuccessOpen}
          title=""
          onClose={() => {
            setIsSuccessOpen(false);
            if (!projectId) navigate('/client/dashboard');
          }}
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              className="icon-box icon-box-green icon-box-lg"
              style={{ margin: '0 auto 16px', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <CheckCircle2 size={30} />
            </div>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Feedback Submitted Successfully!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              Your feedback has been shared with the project management team.
            </p>
            <Button
              variant="success"
              style={{ width: '100%' }}
              onClick={() => {
                setIsSuccessOpen(false);
                if (!projectId) navigate('/client/dashboard');
              }}
            >
              {projectId ? 'Done' : 'Go to Dashboard'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
