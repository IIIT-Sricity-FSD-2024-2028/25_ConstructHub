import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  CheckSquare,
  Users,
  Calendar,
  Clock,
  Edit3
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  formatDate,
  statusBadge,
  priorityBadge
} from '../../../services/utils';
import Button from '../../../components/common/Button';

export default function ProjectManagerTaskDetail() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const id = paramId || searchParams.get('id');
  const navigate = useNavigate();
  const { user } = useOutletContext();

  const [task, setTask] = useState(null);

  useEffect(() => {
    loadTask();
  }, [id, user]);

  async function loadTask() {
    if (!id || !user) return;
    const allTasks = await api.getTasks(user.companyId);
    const found = (allTasks || []).find((t) => t.id === id);
    setTask(found || null);
  }

  if (!task) {
    return (
      <div className="page-container">
        <button
          onClick={() => navigate('/project-manager/tasks')}
          className="back-btn"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={16} /> Back to Tasks
        </button>
        <div className="card" style={{ marginTop: '20px', textAlign: 'center', padding: '40px' }}>
          <h3>Task not found</h3>
          <p style={{ color: 'var(--text-muted)' }}>The requested task could not be located.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button
        onClick={() => navigate('/project-manager/tasks')}
        className="back-btn"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text-muted)',
          marginBottom: '16px'
        }}
      >
        <ArrowLeft size={16} /> Back to Tasks
      </button>

      <div className="page-header-row" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">{task.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span className={`badge ${priorityBadge(task.priority)}`}>{task.priority}</span>
            <span className={`badge ${statusBadge(task.status)}`}>{task.status}</span>
          </div>
        </div>
        <div>
          <Button variant="secondary" onClick={() => navigate('/project-manager/tasks')}>
            ← All Tasks
          </Button>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        {/* Task Info */}
        <div className="detail-section card">
          <h3 style={{ marginBottom: '14px' }}>Task Details</h3>
          <div className="detail-grid">
            <div className="detail-item"><label>Task ID</label><span>{task.id}</span></div>
            <div className="detail-item"><label>Project</label><span>{task.projectName}</span></div>
            <div className="detail-item"><label>Assigned Engineer</label><span>{task.assignedName}</span></div>
            <div className="detail-item"><label>Start Date</label><span>{formatDate(task.startDate)}</span></div>
            <div className="detail-item"><label>Deadline</label><span>{formatDate(task.deadline)}</span></div>
            <div className="detail-item"><label>Priority</label><span>{task.priority}</span></div>
          </div>
        </div>

        {/* Progress & Remarks */}
        <div className="detail-section card">
          <h3 style={{ marginBottom: '14px' }}>Progress & Execution</h3>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Completion</span>
              <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--primary)' }}>{task.progress || 0}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${task.progress || 0}%` }}></div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Engineer Remarks / Updates
            </label>
            <p style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg)', padding: '10px', borderRadius: '6px' }}>
              {task.remarks || 'No updates or remarks submitted yet.'}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="card">
        <h3 style={{ marginBottom: '10px' }}>Task Scope & Description</h3>
        <p style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-muted)' }}>
          {task.description || 'No description provided.'}
        </p>
      </div>
    </div>
  );
}
